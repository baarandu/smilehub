import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { extractBearerToken, validateUUID, validateRequired, ValidationError } from "../_shared/validation.ts";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FUNCTION_NAME = "signature-otp-send";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  const log = createLogger(FUNCTION_NAME, req);

  try {
    const token = extractBearerToken(req.headers.get("Authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit
    await checkRateLimit(supabase, `otp-send:${user.id}`, {
      endpoint: FUNCTION_NAME,
      maxRequests: 10,
      windowMinutes: 15,
    });

    const body = await req.json();
    const clinicId = validateUUID(body.clinic_id, "clinic_id");
    const patientId = validateUUID(body.patient_id, "patient_id");
    const recordType = validateRequired(body.record_type, "record_type");
    const recordId = validateUUID(body.record_id, "record_id");

    if (!["anamnesis", "procedure", "exam"].includes(recordType)) {
      throw new ValidationError("record_type inválido.");
    }

    // Get patient email
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("name, email, birth_date, guardian_email, mother_email")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      throw new ValidationError("Paciente não encontrado.");
    }

    // For minors, use guardian email
    let recipientEmail = patient.email;
    let isMinor = false;

    if (patient.birth_date) {
      const birth = new Date(patient.birth_date);
      const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        isMinor = true;
        recipientEmail = patient.guardian_email || patient.mother_email || patient.email;
      }
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          error: "no_email",
          message: "Paciente não possui e-mail cadastrado.",
          patient_name: patient.name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) {
      throw new Error("Serviço de email não configurado.");
    }

    // Generate 6-digit OTP (cryptographically secure)
    const otpArray = new Uint32Array(1);
    crypto.getRandomValues(otpArray);
    const otpCode = String(100000 + (otpArray[0] % 900000));

    // Hash the OTP (SHA-256)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otpCode));
    const otpHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const maskedEmail = maskEmail(recipientEmail);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Expire any previous pending challenges for this record
    await supabase
      .from("signature_otp_challenges")
      .update({ status: "expired" })
      .eq("patient_id", patientId)
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .eq("status", "sent");

    // Create challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("signature_otp_challenges")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
        email_to: maskedEmail,
        otp_hash: otpHash,
        expires_at: expiresAt,
        request_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        request_user_agent: req.headers.get("user-agent") || null,
      })
      .select("id, expires_at, max_attempts")
      .single();

    if (challengeError) {
      log.error("Failed to create OTP challenge", { error: challengeError.message });
      throw new Error("Erro ao criar desafio OTP.");
    }

    // Send email via Resend
    const signerLabel = isMinor ? "Responsável Legal" : "Paciente";
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Organiza Odonto <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: "Código de Verificação — Assinatura de Prontuário",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D9488;">Código de Verificação</h2>
            <p>Olá! Você está assinando um prontuário clínico como <strong>${signerLabel}</strong>.</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${otpCode}</span>
            </div>
            <p style="color: #666; font-size: 14px;">Este código expira em <strong>10 minutos</strong>.</p>
            <p style="color: #666; font-size: 14px;">Se você não solicitou este código, ignore este e-mail.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">Organiza Odonto — Assinatura Digital de Prontuários</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.json();
      log.error("Resend API error", { error: JSON.stringify(emailError) });
      throw new Error("Erro ao enviar email de convite");
    }

    log.audit(supabase, {
      action: "SIGNATURE_OTP_SENT",
      table_name: "signature_otp_challenges",
      record_id: challenge.id,
      user_id: user.id,
      clinic_id: clinicId,
      details: {
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
        is_minor: isMinor,
        email_masked: maskedEmail,
      },
    });

    return new Response(
      JSON.stringify({
        challenge_id: challenge.id,
        expires_at: challenge.expires_at,
        attempts_left: challenge.max_attempts,
        email_masked: maskedEmail,
        is_minor: isMinor,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, FUNCTION_NAME);
  }
});
