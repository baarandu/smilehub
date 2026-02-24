import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { extractBearerToken, validateUUID, validateRequired, ValidationError } from "../_shared/validation.ts";
import { createLogger } from "../_shared/logger.ts";
import { computeRecordHash } from "../_shared/contentHash.ts";

const FUNCTION_NAME = "clinical-signature-create";
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado. Assinatura OTP indisponível.");
}

/** Verify short-lived OTP JWT */
async function verifyOtpToken(token: string): Promise<{
  sub: string;
  patient_id: string;
  record_type: string;
  record_id: string;
} | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(
      atob(signature.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(`${header}.${payload}`));
    if (!valid) return null;

    // Decode payload
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiration
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;

    // Check purpose
    if (decoded.purpose !== "otp_verified") return null;

    return decoded;
  } catch {
    return null;
  }
}

/** Fetch the record from the appropriate table */
async function fetchRecord(
  supabase: any,
  recordType: string,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  const table = recordType === "procedure" ? "procedures"
    : recordType === "anamnesis" ? "anamneses"
    : "exams";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !data) return null;
  return data as Record<string, unknown>;
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

    // Parse multipart form data
    const formData = await req.formData();
    const clinicId = validateUUID(formData.get("clinic_id") as string, "clinic_id");
    const patientId = validateUUID(formData.get("patient_id") as string, "patient_id");
    const recordType = validateRequired(formData.get("record_type") as string, "record_type");
    const recordId = validateUUID(formData.get("record_id") as string, "record_id");
    const signerType = validateRequired(formData.get("signer_type") as string, "signer_type");
    const signerName = validateRequired(formData.get("signer_name") as string, "signer_name");
    const contentHashFrontend = validateRequired(formData.get("content_hash") as string, "content_hash");
    const signatureFile = formData.get("signature_image") as File | null;
    const otpVerifiedToken = formData.get("otp_verified_token") as string | null;
    const otpChallengeId = formData.get("otp_challenge_id") as string | null;

    if (!["anamnesis", "procedure", "exam"].includes(recordType)) {
      throw new ValidationError("record_type inválido.");
    }
    if (!["patient", "dentist"].includes(signerType)) {
      throw new ValidationError("signer_type inválido.");
    }

    // For patient signatures, validate OTP token (if provided)
    let otpMethod: string | null = null;
    let otpEmailMasked: string | null = null;
    let validatedChallengeId: string | null = null;

    if (signerType === "patient" && otpVerifiedToken) {
      const otpPayload = await verifyOtpToken(otpVerifiedToken);
      if (!otpPayload) {
        throw new ValidationError("Token OTP inválido ou expirado.");
      }
      if (otpPayload.patient_id !== patientId || otpPayload.record_type !== recordType || otpPayload.record_id !== recordId) {
        throw new ValidationError("Token OTP não corresponde ao registro.");
      }
      otpMethod = "email";
      validatedChallengeId = otpPayload.sub;

      // Get masked email from challenge
      const { data: challenge } = await supabase
        .from("signature_otp_challenges")
        .select("email_to")
        .eq("id", validatedChallengeId)
        .single();
      if (challenge) {
        otpEmailMasked = challenge.email_to;
      }
    }

    // Fetch record from DB and recompute hash server-side
    const record = await fetchRecord(supabase, recordType, recordId);
    if (!record) {
      throw new ValidationError("Registro clínico não encontrado.");
    }

    const serverHash = await computeRecordHash(record, recordType);

    // Compare frontend hash vs server hash
    if (contentHashFrontend !== serverHash) {
      log.warn("Content hash mismatch", {
        frontend: contentHashFrontend,
        server: serverHash,
        record_type: recordType,
        record_id: recordId,
      });
      throw new ValidationError("Hash do conteúdo não confere. O registro pode ter sido alterado.");
    }

    // Upload signature image
    let signatureImageUrl: string | null = null;
    if (signatureFile) {
      const filePath = `${clinicId}/${patientId}/${recordType}_${recordId}_${signerType}_${Date.now()}.png`;
      const fileBuffer = new Uint8Array(await signatureFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(filePath, fileBuffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        log.error("Signature upload failed", { error: uploadError.message });
        throw new Error("Erro ao salvar imagem da assinatura.");
      }

      signatureImageUrl = filePath;
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    // Insert signature record (service_role bypasses RLS)
    const { data: signature, error: sigError } = await supabase
      .from("clinical_record_signatures")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
        signer_type: signerType,
        signer_name: signerName,
        signer_user_id: signerType === "dentist" ? user.id : null,
        signature_image_url: signatureImageUrl,
        content_hash: serverHash,
        content_hash_verified: true,
        ip_address: ipAddress,
        user_agent: userAgent,
        otp_method: otpMethod,
        otp_challenge_id: validatedChallengeId,
        otp_email_masked: otpEmailMasked,
      })
      .select("id, signed_at")
      .single();

    if (sigError) {
      // Unique constraint: already signed
      if (sigError.code === "23505") {
        throw new ValidationError("Este registro já foi assinado por este tipo de assinante.");
      }
      log.error("Signature insert failed", { error: sigError.message });
      throw new Error("Erro ao registrar assinatura.");
    }

    log.audit(supabase, {
      action: "CLINICAL_SIGNATURE_CREATED",
      table_name: "clinical_record_signatures",
      record_id: signature.id,
      user_id: user.id,
      clinic_id: clinicId,
      details: {
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
        signer_type: signerType,
        content_hash_verified: true,
        otp_method: otpMethod,
      },
    });

    return new Response(
      JSON.stringify({
        id: signature.id,
        signed_at: signature.signed_at,
        content_hash: serverHash,
        content_hash_verified: true,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, FUNCTION_NAME);
  }
});
