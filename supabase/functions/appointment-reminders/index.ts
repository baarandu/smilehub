/**
 * Appointment Reminders - Edge Function
 * Triggered by pg_cron every 5 minutes.
 * Sends 24h and 2h appointment reminders via WhatsApp (Evolution API).
 * Uses GPT-4o-mini for personalized message generation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";
import { fetchWithRetry } from "../_shared/fetchWithRetry.ts";

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

// ─── Evolution API helpers ───────────────────────────────────────────────────

async function sendWhatsAppText(
  instance: string,
  phone: string,
  text: string
): Promise<void> {
  const response = await fetchWithRetry(`${EVOLUTION_API_URL}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      textMessage: { text },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Evolution send error: ${response.status} - ${err}`);
  }
}

// ─── Message Generation ──────────────────────────────────────────────────────

function buildReminderMessage(
  appointment: any,
  type: "24h" | "2h"
): string {
  const template = type === "24h"
    ? appointment.reminder_message_24h || "Olá {nome}! Lembrete: você tem consulta amanhã às {hora} com {profissional}."
    : appointment.reminder_message_2h || "Olá {nome}! Sua consulta é em 2 horas! Endereço: {endereco}";

  let msg = template
    .replace("{nome}", appointment.patient_name || "")
    .replace("{hora}", appointment.time?.substring(0, 5) || "")
    .replace("{profissional}", appointment.professional_name || "")
    .replace("{endereco}", appointment.clinic_address || appointment.location || "")
    .replace("{data}", formatDate(appointment.date))
    .replace("{procedimento}", appointment.procedure_name || "Consulta");

  // Add confirmation question if enabled
  if (appointment.reminder_ask_confirmation) {
    msg += "\n\nVocê confirma presença? Responda SIM ou NÃO.";
  }

  return msg;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string): string {
  // Clean to digits only
  return phone.replace(/\D/g, "");
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  const log = createLogger("appointment-reminders");

  // Accept POST (from pg_cron) or GET (manual trigger)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch appointments due in the next 25 hours (covers both 24h and 2h windows)
    const { data: reminders, error } = await supabase.rpc("ai_get_due_reminders", {
      p_hours_before: 25,
    });

    if (error) {
      log.error("Failed to fetch reminders", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const appointments = reminders || [];
    log.info(`Found ${appointments.length} appointments to check`);

    let sent24h = 0;
    let sent2h = 0;
    let errors = 0;

    for (const apt of appointments) {
      try {
        if (!apt.evolution_instance_name || !apt.patient_phone) continue;

        const phone = formatPhone(apt.patient_phone);
        if (!phone) continue;

        const appointmentDateTime = new Date(`${apt.date}T${apt.time}`);
        const now = new Date();
        const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // 24h reminder: between 23-25 hours before
        if (!apt.reminder_24h_sent && hoursUntil <= 25 && hoursUntil > 3) {
          const msg = buildReminderMessage(apt, "24h");
          await sendWhatsAppText(apt.evolution_instance_name, phone, msg);

          // Mark as sent
          await supabase
            .from("appointments")
            .update({ reminder_24h_sent: true })
            .eq("id", apt.appointment_id);

          sent24h++;
          log.info("Sent 24h reminder", { appointmentId: apt.appointment_id, phone });
        }

        // 2h reminder: between 1.5-3 hours before
        if (!apt.reminder_2h_sent && hoursUntil <= 3 && hoursUntil > 0) {
          const msg = buildReminderMessage(apt, "2h");
          await sendWhatsAppText(apt.evolution_instance_name, phone, msg);

          // Mark as sent
          await supabase
            .from("appointments")
            .update({ reminder_2h_sent: true })
            .eq("id", apt.appointment_id);

          sent2h++;
          log.info("Sent 2h reminder", { appointmentId: apt.appointment_id, phone });
        }
      } catch (err: any) {
        errors++;
        log.error("Failed to send reminder", {
          appointmentId: apt.appointment_id,
          error: err.message,
        });
      }
    }

    log.info("Reminders complete", { sent24h, sent2h, errors, total: appointments.length });

    return new Response(
      JSON.stringify({ status: "ok", sent24h, sent2h, errors }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error(`Reminder error: ${error.message}`, { stack: error.stack });
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
