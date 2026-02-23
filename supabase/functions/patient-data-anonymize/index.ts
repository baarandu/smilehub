import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { extractBearerToken, validateUUID } from "../_shared/validation.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";

/**
 * Patient Data Anonymization — LGPD Art. 18 IV
 * Anonymizes all PII for a given patient.
 * Admin-only, with double confirmation and retention override.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("patient-data-anonymize", req);

  try {
    // Auth
    const token = extractBearerToken(req.headers.get("Authorization"));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System", details: { reason: "Invalid token" } });
      throw new Error("Unauthorized");
    }

    // Rate limit: 2 anonymizations per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "patient-data-anonymize",
      maxRequests: 2,
      windowMinutes: 60,
    });

    const body = await req.json();
    const { patientId, clinicId, confirmationCode, overrideRetention, overrideReason } = body;

    validateUUID(patientId, "patientId");
    validateUUID(clinicId, "clinicId");

    if (!confirmationCode || typeof confirmationCode !== "string") {
      throw new Error("Missing required fields");
    }

    // Verify user is admin for this clinic
    const { data: clinicUser, error: accessError } = await supabase
      .from("clinic_users")
      .select("role, roles")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single();

    if (accessError || !clinicUser) {
      throw new Error("Unauthorized");
    }

    const userRoles: string[] = clinicUser.roles || (clinicUser.role ? [clinicUser.role] : []);
    if (!userRoles.includes("admin")) {
      throw new Error("Only admins can use");
    }

    // Fetch patient to verify confirmation code
    const { data: patient, error: patientError } = await supabase
      .from("patients_secure")
      .select("name, clinic_id")
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .single();

    if (patientError || !patient) {
      throw new Error("Paciente não encontrado.");
    }

    // Double confirmation: first 4 chars of name (uppercase, no spaces)
    const expectedCode = patient.name
      .replace(/\s+/g, "")
      .substring(0, 4)
      .toUpperCase();

    if (confirmationCode.toUpperCase() !== expectedCode) {
      log.audit(supabase, {
        action: "ANONYMIZE_FAILED", table_name: "patients", record_id: patientId,
        user_id: user.id, clinic_id: clinicId,
        details: { reason: "Invalid confirmation code" },
      });
      throw new Error("Código de confirmação incorreto.");
    }

    // Call the RPC via service_role (already using service_role client)
    const { error: rpcError } = await supabase.rpc("anonymize_patient_data", {
      p_patient_id: patientId,
      p_user_id: user.id,
      p_override_retention: overrideRetention || false,
      p_override_reason: overrideReason || null,
    });

    if (rpcError) {
      // Check for known error messages from the RPC
      const msg = rpcError.message || "";
      if (msg.includes("retenção legal") || msg.includes("Justificativa") || msg.includes("não encontrado")) {
        throw new Error(msg);
      }
      throw rpcError;
    }

    log.audit(supabase, {
      action: "ANONYMIZE_SUCCESS", table_name: "patients", record_id: patientId,
      user_id: user.id, clinic_id: clinicId,
      details: { override: overrideRetention || false },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Dados anonimizados com sucesso." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, "patient-data-anonymize");
  }
});
