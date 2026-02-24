// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  extractBearerToken,
  validateUUID,
  validateRequired,
  validateMaxLength,
  ValidationError,
} from "../_shared/validation.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";

const SUPERSIGN_API = "https://api.sign.supersign.com.br";
const FUNCTION_NAME = "supersign-envelope";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const logger = createLogger(FUNCTION_NAME, req);

  try {
    // Auth — use service role key (same pattern as dentist-agent)
    const token = extractBearerToken(req.headers.get("authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Rate limit
    await checkRateLimit(supabase, user.id, {
      endpoint: FUNCTION_NAME,
      maxRequests: 30,
      windowMinutes: 5,
    });

    const body = await req.json();
    const action = validateRequired(body.action, "action");

    logger.info(`Action: ${action}`, { userId: user.id });

    if (action === "create") {
      return await handleCreate(body, user, supabase, corsHeaders, logger);
    } else if (action === "status") {
      return await handleStatus(body, user, supabase, corsHeaders, logger);
    } else if (action === "signing-url") {
      return await handleSigningUrl(body, user, supabase, corsHeaders, logger);
    } else {
      throw new ValidationError("Ação inválida. Use: create, status, signing-url");
    }
  } catch (error) {
    return createErrorResponse(error, corsHeaders, FUNCTION_NAME);
  }
});

async function handleCreate(
  body: any,
  user: any,
  supabase: any,
  corsHeaders: Record<string, string>,
  logger: any
): Promise<Response> {
  logger.info("Step 1: Validating inputs");
  const patientId = validateUUID(body.patient_id, "patient_id");
  const clinicId = validateUUID(body.clinic_id, "clinic_id");
  const title = validateMaxLength(validateRequired(body.title, "title"), 200, "title");
  const pdfStoragePath = validateRequired(body.pdf_storage_path, "pdf_storage_path");
  if (!pdfStoragePath.endsWith('.pdf')) {
    throw new ValidationError("Apenas arquivos PDF são aceitos para assinatura digital.");
  }
  const needsPatientSignature = !!body.needs_patient_signature;
  const patientDeliveryMethod = body.patient_delivery_method || null;
  const documentTemplateId = body.document_template_id || null;

  logger.info("Step 2: Checking clinic user");

  // Verify user belongs to clinic
  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("role, roles")
    .eq("user_id", user.id)
    .eq("clinic_id", clinicId)
    .single();

  const userRoles: string[] = clinicUser?.roles || (clinicUser?.role ? [clinicUser.role] : []);
  if (!clinicUser || !userRoles.some((r: string) => ["admin", "dentist"].includes(r))) {
    throw new Error("Apenas dentistas e administradores");
  }

  logger.info("Step 3: Getting patient data");

  // Get patient data
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("name, email, phone")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    logger.error("Patient not found", { patientError: patientError?.message });
    throw new ValidationError("Paciente não encontrado.");
  }

  logger.info("Step 4: Getting dentist profile");

  // Get dentist profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const dentistName = profile?.full_name || "Dentista";
  const dentistEmail = profile?.email || user.email;

  logger.info("Step 5: Downloading PDF from storage", { pdfStoragePath });

  // Download PDF from storage (uploaded by frontend)
  const { data: pdfData, error: downloadError } = await supabase.storage
    .from("exams")
    .download(pdfStoragePath);

  if (downloadError || !pdfData) {
    logger.error("Storage download failed", { error: downloadError?.message });
    throw new Error("Erro ao ler PDF do storage.");
  }

  const pdfBuffer = new Uint8Array(await pdfData.arrayBuffer());

  // Create a signed URL so SuperSign can download the PDF (bucket may not be public)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("exams")
    .createSignedUrl(pdfStoragePath, 3600); // 1 hour expiry

  if (signedUrlError || !signedUrlData?.signedUrl) {
    logger.error("Failed to create signed URL", { error: signedUrlError?.message });
    throw new Error("Erro ao gerar URL do PDF.");
  }

  const pdfUrl = signedUrlData.signedUrl;
  logger.info("Step 5b: Signed URL created", { pdfUrl: pdfUrl.substring(0, 80) + "..." });

  // Document ID for referencing in fields
  const documentId = crypto.randomUUID();

  // Build signatories
  const signatories: any[] = [
    {
      id: crypto.randomUUID(),
      name: dentistName,
      email: dentistEmail,
      qualification: dentistEmail,
      authMethod: "EMAIL",
      role: "SIGNER",
    },
  ];

  if (needsPatientSignature) {
    const patientSignatory: any = {
      id: crypto.randomUUID(),
      name: patient.name,
      qualification: patient.email || patient.phone || patient.name,
      role: "SIGNER",
    };

    if (patientDeliveryMethod === "WHATSAPP" && patient.phone) {
      patientSignatory.phone = patient.phone.replace(/\D/g, "");
      patientSignatory.authMethod = "SMS";
    } else if (patient.email) {
      patientSignatory.email = patient.email;
      patientSignatory.authMethod = "EMAIL";
    } else {
      throw new ValidationError(
        "Paciente não possui email ou telefone para receber o documento."
      );
    }

    signatories.push(patientSignatory);
  }

  // Build signature fields — one per signatory on last page
  const fields: any[] = signatories.map((sig, idx) => ({
    type: "SIGNATURE",
    documentId,
    signatoryId: sig.id,
    pageNumber: 1,
    position: {
      x: idx === 0 ? 15 : 55,
      y: 85,
      width: 30,
      height: 8,
    },
  }));

  // Create envelope on SuperSign
  const supersignToken = Deno.env.get("SUPERSIGN_API_TOKEN");
  const supersignAccountId = Deno.env.get("SUPERSIGN_ACCOUNT_ID");

  if (!supersignToken || !supersignAccountId) {
    throw new Error("Erro de configuração do serviço de assinatura digital");
  }

  const envelopePayload = {
    title,
    documents: [{ id: documentId, fileName: `${title}.pdf`, url: pdfUrl, contentType: "application/pdf" }],
    signatories,
    fields,
    message: `Documento "${title}" para assinatura digital.`,
  };

  logger.info("Step 6: Creating SuperSign envelope", { title, signatoryCount: signatories.length });

  const envelopeRes = await fetch(`${SUPERSIGN_API}/v2/envelopes/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supersignToken}`,
      "x-account-id": supersignAccountId,
    },
    body: JSON.stringify(envelopePayload),
  });

  if (!envelopeRes.ok) {
    const errBody = await envelopeRes.text();
    logger.error("SuperSign API error", { status: envelopeRes.status, body: errBody.substring(0, 300) });
    throw new Error("Erro ao criar envelope: " + errBody.substring(0, 200));
  }

  const envelopeData = await envelopeRes.json();

  const envelopeId = envelopeData.id || envelopeData.envelopeId;
  const uploadDetails = envelopeData.uploadDetails || [];

  // Upload PDF to SuperSign (if they want us to upload instead of fetching from URL)
  if (uploadDetails.length > 0) {
    const uploadUrl = uploadDetails[0].uploadUrl;
    const upDocId = uploadDetails[0].documentId;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
        "x-goog-meta-documentid": upDocId,
      },
      body: pdfBuffer,
    });

    if (!uploadRes.ok) {
      logger.error("SuperSign PDF upload failed", { status: uploadRes.status });
      throw new Error("Erro ao enviar PDF para assinatura.");
    }
  }

  // Fetch full envelope details (create response may not include signing tokens)
  let fullEnvelope = envelopeData;
  if (envelopeId) {
    try {
      const detailRes = await fetch(`${SUPERSIGN_API}/v2/envelopes/${envelopeId}`, {
        headers: {
          Authorization: `Bearer ${supersignToken}`,
          "x-account-id": supersignAccountId,
        },
      });
      if (detailRes.ok) {
        fullEnvelope = await detailRes.json();
      }
    } catch (e) {
      logger.warn("Failed to fetch envelope details", { error: String(e) });
    }
  }

  // Extract signatory info (prefer full envelope data)
  const envelopeSignatories = fullEnvelope.signatories || envelopeData.signatories || [];
  const dentistSig = envelopeSignatories[0] || {};
  const patientSig = needsPatientSignature ? envelopeSignatories[1] || {} : null;

  // Insert into digital_signatures
  const { data: signature, error: insertError } = await supabase
    .from("digital_signatures")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      created_by: user.id,
      envelope_id: envelopeId,
      title,
      status: envelopeData.status || "DRAFT",
      document_template_id: documentTemplateId,
      original_pdf_url: pdfUrl,
      dentist_signatory_id: dentistSig.id || null,
      dentist_status: dentistSig.status || "PENDING",
      dentist_signature_token: dentistSig.signatureToken || null,
      patient_signatory_id: patientSig?.id || null,
      patient_status: patientSig?.status || null,
      patient_delivery_method: needsPatientSignature ? (patientDeliveryMethod || "EMAIL") : null,
      supersign_data: envelopeData,
    })
    .select("id")
    .single();

  if (insertError) {
    logger.error("DB insert failed", { error: insertError.message });
    throw new Error("Erro ao salvar assinatura.");
  }

  // Build signing URL for dentist
  const dentistSigningUrl = dentistSig.signatureToken
    ? `https://app.supersign.com.br/sign/${dentistSig.signatureToken}`
    : "";

  logger.audit(supabase, {
    action: "DIGITAL_SIGNATURE_CREATED",
    table_name: "digital_signatures",
    record_id: signature.id,
    user_id: user.id,
    clinic_id: clinicId,
    details: { envelope_id: envelopeId, title, needs_patient: needsPatientSignature },
  });

  return new Response(
    JSON.stringify({
      signature_id: signature.id,
      envelope_id: envelopeId,
      dentist_signing_url: dentistSigningUrl,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleStatus(
  body: any,
  user: any,
  supabase: any,
  corsHeaders: Record<string, string>,
  logger: any
): Promise<Response> {
  const signatureId = validateUUID(body.signature_id, "signature_id");

  const { data: sig, error } = await supabase
    .from("digital_signatures")
    .select("*")
    .eq("id", signatureId)
    .single();

  if (error || !sig) {
    throw new ValidationError("Assinatura não encontrada.");
  }

  // Fetch latest status from SuperSign
  const supersignToken = Deno.env.get("SUPERSIGN_API_TOKEN");
  const supersignAccountId = Deno.env.get("SUPERSIGN_ACCOUNT_ID");

  if (supersignToken && supersignAccountId && sig.envelope_id) {
    try {
      const res = await fetch(`${SUPERSIGN_API}/v2/envelopes/${sig.envelope_id}`, {
        headers: {
          Authorization: `Bearer ${supersignToken}`,
          "x-account-id": supersignAccountId,
        },
      });

      if (res.ok) {
        const envelope = await res.json();
        const envelopeSignatories = envelope.signatories || [];
        const dentistSig = envelopeSignatories[0] || {};
        const patientSig = envelopeSignatories[1] || null;

        const updates: Record<string, any> = {
          status: envelope.status || sig.status,
          dentist_status: dentistSig.status || sig.dentist_status,
          dentist_signature_token: dentistSig.signatureToken || sig.dentist_signature_token,
          supersign_data: envelope,
        };

        if (patientSig) {
          updates.patient_status = patientSig.status || sig.patient_status;
        }

        if (envelope.status === "COMPLETED" && !sig.completed_at) {
          updates.completed_at = new Date().toISOString();
        }

        await supabase
          .from("digital_signatures")
          .update(updates)
          .eq("id", signatureId);

        Object.assign(sig, updates);
      }
    } catch (e) {
      logger.warn("Failed to fetch SuperSign status", { error: String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      id: sig.id,
      status: sig.status,
      dentist_status: sig.dentist_status,
      patient_status: sig.patient_status,
      signed_pdf_url: sig.signed_pdf_url,
      completed_at: sig.completed_at,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleSigningUrl(
  body: any,
  user: any,
  supabase: any,
  corsHeaders: Record<string, string>,
  logger: any
): Promise<Response> {
  const signatureId = validateUUID(body.signature_id, "signature_id");

  const { data: sig, error } = await supabase
    .from("digital_signatures")
    .select("dentist_signature_token, envelope_id")
    .eq("id", signatureId)
    .single();

  if (error || !sig) {
    throw new ValidationError("Assinatura não encontrada.");
  }

  if (!sig.dentist_signature_token) {
    // Try to refresh from SuperSign
    const supersignToken = Deno.env.get("SUPERSIGN_API_TOKEN");
    const supersignAccountId = Deno.env.get("SUPERSIGN_ACCOUNT_ID");

    if (supersignToken && supersignAccountId && sig.envelope_id) {
      const res = await fetch(`${SUPERSIGN_API}/v2/envelopes/${sig.envelope_id}`, {
        headers: {
          Authorization: `Bearer ${supersignToken}`,
          "x-account-id": supersignAccountId,
        },
      });

      if (res.ok) {
        const envelope = await res.json();
        const dentistSig = (envelope.signatories || [])[0];
        if (dentistSig?.signatureToken) {
          sig.dentist_signature_token = dentistSig.signatureToken;
          await supabase
            .from("digital_signatures")
            .update({ dentist_signature_token: dentistSig.signatureToken })
            .eq("id", signatureId);
        }
      }
    }
  }

  if (!sig.dentist_signature_token) {
    throw new ValidationError("URL de assinatura não disponível.");
  }

  return new Response(
    JSON.stringify({
      signing_url: `https://app.supersign.com.br/sign/${sig.dentist_signature_token}`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
