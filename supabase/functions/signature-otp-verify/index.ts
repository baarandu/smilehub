import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { extractBearerToken, validateUUID, validateRequired, ValidationError } from "../_shared/validation.ts";
import { createLogger } from "../_shared/logger.ts";

const FUNCTION_NAME = "signature-otp-verify";
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado. Verificação OTP indisponível.");
}

/** Create a short-lived JWT for OTP verification (5 min) */
async function createOtpToken(challengeId: string, patientId: string, recordType: string, recordId: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const payload = btoa(JSON.stringify({
    sub: challengeId,
    patient_id: patientId,
    record_type: recordType,
    record_id: recordId,
    purpose: "otp_verified",
    exp: Math.floor(Date.now() / 1000) + 300, // 5 min
    iat: Math.floor(Date.now() / 1000),
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${payload}`));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${header}.${payload}.${signature}`;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  const log = createLogger(FUNCTION_NAME, req);

  try {
    const token = extractBearerToken(req.headers.get("Authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
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

    const body = await req.json();
    const challengeId = validateUUID(body.challenge_id, "challenge_id");
    const otpCode = validateRequired(body.otp_code, "otp_code");

    if (!/^\d{6}$/.test(otpCode)) {
      throw new ValidationError("Código deve ter 6 dígitos.");
    }

    // Fetch challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("signature_otp_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      throw new ValidationError("Desafio OTP não encontrado.");
    }

    // Check status
    if (challenge.status === "verified") {
      throw new ValidationError("Código já foi utilizado.");
    }
    if (challenge.status === "locked") {
      throw new ValidationError("Código bloqueado por excesso de tentativas.");
    }
    if (challenge.status === "expired") {
      throw new ValidationError("Código expirado.");
    }

    // Check expiration
    if (new Date(challenge.expires_at) < new Date()) {
      await supabase
        .from("signature_otp_challenges")
        .update({ status: "expired" })
        .eq("id", challengeId);
      throw new ValidationError("Código expirado.");
    }

    // Check max attempts
    if (challenge.attempts >= challenge.max_attempts) {
      await supabase
        .from("signature_otp_challenges")
        .update({ status: "locked" })
        .eq("id", challengeId);
      throw new ValidationError("Código bloqueado por excesso de tentativas.");
    }

    // Hash input and compare
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otpCode));
    const inputHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const verifyIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const verifyUa = req.headers.get("user-agent") || null;

    if (inputHash !== challenge.otp_hash) {
      // Increment attempts
      const newAttempts = challenge.attempts + 1;
      const newStatus = newAttempts >= challenge.max_attempts ? "locked" : "sent";

      await supabase
        .from("signature_otp_challenges")
        .update({
          attempts: newAttempts,
          status: newStatus,
          verify_ip: verifyIp,
          verify_user_agent: verifyUa,
        })
        .eq("id", challengeId);

      log.audit(supabase, {
        action: "SIGNATURE_OTP_FAILED",
        table_name: "signature_otp_challenges",
        record_id: challengeId,
        user_id: user.id,
        clinic_id: challenge.clinic_id,
        details: { attempts: newAttempts, locked: newStatus === "locked" },
      });

      const remaining = challenge.max_attempts - newAttempts;
      if (remaining <= 0) {
        throw new ValidationError("Código bloqueado por excesso de tentativas.");
      }
      throw new ValidationError(`Código incorreto. ${remaining} tentativa(s) restante(s).`);
    }

    // OTP verified!
    await supabase
      .from("signature_otp_challenges")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        attempts: challenge.attempts + 1,
        verify_ip: verifyIp,
        verify_user_agent: verifyUa,
      })
      .eq("id", challengeId);

    // Create short-lived JWT
    const otpVerifiedToken = await createOtpToken(
      challengeId,
      challenge.patient_id,
      challenge.record_type,
      challenge.record_id,
    );

    log.audit(supabase, {
      action: "SIGNATURE_OTP_VERIFIED",
      table_name: "signature_otp_challenges",
      record_id: challengeId,
      user_id: user.id,
      clinic_id: challenge.clinic_id,
      details: {
        patient_id: challenge.patient_id,
        record_type: challenge.record_type,
        record_id: challenge.record_id,
      },
    });

    return new Response(
      JSON.stringify({
        verified: true,
        otp_verified_token: otpVerifiedToken,
        challenge_id: challengeId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, FUNCTION_NAME);
  }
});
