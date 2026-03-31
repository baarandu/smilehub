/**
 * Lead Recovery - Edge Function
 * Triggered by pg_cron every 30 minutes.
 * Follows up on stale conversations where the patient hasn't responded.
 * Uses GPT-4o-mini for contextual follow-up messages.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";
import { fetchWithRetry } from "../_shared/fetchWithRetry.ts";

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const MAX_FOLLOWUPS = 3;

// ─── Evolution API helper ────────────────────────────────────────────────────

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

// ─── Follow-up Message Generation ────────────────────────────────────────────

async function generateFollowupMessage(
  contactName: string | null,
  lastMessage: string | null,
  followupCount: number
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return getDefaultFollowup(contactName, followupCount);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é uma atendente simpática de clínica odontológica. Gere uma mensagem curta de follow-up para WhatsApp.

REGRAS:
- Mensagem curta (1-2 frases)
- Tom amigável e não invasivo
- NÃO use Markdown
- Adapte com base na tentativa:
  - 1ª tentativa: gentil e prestativa
  - 2ª tentativa: breve e objetiva
  - 3ª tentativa: última oportunidade, sem pressão
- Se houver contexto da última mensagem, use-o
- NUNCA forneça diagnósticos ou informações médicas`,
          },
          {
            role: "user",
            content: `Gere follow-up para:
Nome: ${contactName || "paciente"}
Tentativa: ${followupCount + 1} de ${MAX_FOLLOWUPS}
Última mensagem da conversa: ${lastMessage || "Sem contexto"}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getDefaultFollowup(contactName, followupCount);
  } catch {
    return getDefaultFollowup(contactName, followupCount);
  }
}

function getDefaultFollowup(name: string | null, count: number): string {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  switch (count) {
    case 0:
      return `${greeting} Vi que ficamos com a conversa em aberto. Posso ajudar com algo? Estou por aqui! 😊`;
    case 1:
      return `${greeting} Gostaria de agendar uma consulta ou tirar alguma dúvida?`;
    case 2:
      return `${greeting} Caso precise de alguma coisa, é só chamar. Ficaremos felizes em ajudar!`;
    default:
      return `${greeting} Estamos à disposição quando precisar!`;
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  const log = createLogger("lead-recovery");

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch stale leads (conversations with no patient response in 6+ hours)
    const { data: leads, error } = await supabase.rpc("ai_get_stale_leads", {
      p_min_hours_stale: 6,
    });

    if (error) {
      log.error("Failed to fetch stale leads", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const staleLeads = leads || [];
    log.info(`Found ${staleLeads.length} stale leads to follow up`);

    let sentCount = 0;
    let abandonedCount = 0;
    let errorCount = 0;

    for (const lead of staleLeads) {
      try {
        if (!lead.evolution_instance_name || !lead.phone_number) continue;

        // Check if max followups reached → mark as abandoned
        if (lead.followup_count >= MAX_FOLLOWUPS) {
          await supabase
            .from("ai_secretary_conversations")
            .update({ status: "abandoned", ended_at: new Date().toISOString() })
            .eq("id", lead.conversation_id);

          abandonedCount++;
          log.info("Lead abandoned (max followups)", { conversationId: lead.conversation_id });
          continue;
        }

        // Generate contextual follow-up message
        const msg = await generateFollowupMessage(
          lead.contact_name,
          lead.last_message,
          lead.followup_count
        );

        // Send via WhatsApp
        await sendWhatsAppText(lead.evolution_instance_name, lead.phone_number, msg);

        // Update conversation
        await supabase
          .from("ai_secretary_conversations")
          .update({
            followup_count: (lead.followup_count || 0) + 1,
            last_followup_at: new Date().toISOString(),
          })
          .eq("id", lead.conversation_id);

        // Log the follow-up message
        await supabase.rpc("log_ai_message", {
          p_conversation_id: lead.conversation_id,
          p_sender: "ai",
          p_content: msg,
          p_intent: "followup",
        });

        sentCount++;
        log.info("Sent follow-up", {
          conversationId: lead.conversation_id,
          attempt: (lead.followup_count || 0) + 1,
        });
      } catch (err: any) {
        errorCount++;
        log.error("Failed to send follow-up", {
          conversationId: lead.conversation_id,
          error: err.message,
        });
      }
    }

    log.info("Lead recovery complete", { sent: sentCount, abandoned: abandonedCount, errors: errorCount });

    return new Response(
      JSON.stringify({ status: "ok", sent: sentCount, abandoned: abandonedCount, errors: errorCount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    log.error(`Lead recovery error: ${error.message}`, { stack: error.stack });
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
