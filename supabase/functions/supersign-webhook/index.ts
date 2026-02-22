// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";

const SUPERSIGN_API = "https://api.sign.supersign.com.br";
const FUNCTION_NAME = "supersign-webhook";

serve(async (req: Request) => {
  // Webhooks are POST only, no CORS needed (server-to-server)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const logger = createLogger(FUNCTION_NAME);

  try {
    // Validate HMAC signature
    const signatureHeader = req.headers.get("X-SuperSign-Signature") || req.headers.get("x-supersign-signature");
    const webhookSecret = Deno.env.get("SUPERSIGN_WEBHOOK_SECRET");

    if (!webhookSecret) {
      logger.error("SUPERSIGN_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not set", { status: 500 });
    }

    const body = await req.text();

    if (signatureHeader) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const expected = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (expected !== signatureHeader.replace("sha256=", "")) {
        logger.error("Webhook signature verification failed");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event = JSON.parse(body);
    logger.info("Webhook received", { event: event.event, envelopeId: event.envelopeId });

    // Only process ENVELOPE_COMPLETED
    if (event.event !== "ENVELOPE_COMPLETED") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const envelopeId = event.envelopeId || event.envelope_id;
    if (!envelopeId) {
      logger.error("No envelopeId in webhook payload");
      return new Response("Missing envelopeId", { status: 400 });
    }

    // Find our record
    const { data: sig, error: sigError } = await supabase
      .from("digital_signatures")
      .select("*")
      .eq("envelope_id", envelopeId)
      .single();

    if (sigError || !sig) {
      logger.warn("Signature record not found for envelope", { envelopeId });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get signed PDF from SuperSign
    const supersignToken = Deno.env.get("SUPERSIGN_API_TOKEN");
    const supersignAccountId = Deno.env.get("SUPERSIGN_ACCOUNT_ID");

    let signedPdfUrl: string | null = null;
    let examId: string | null = null;

    if (supersignToken && supersignAccountId) {
      // Fetch envelope details to get signedFileKey
      const envelopeRes = await fetch(`${SUPERSIGN_API}/v2/envelopes/${envelopeId}`, {
        headers: {
          Authorization: `Bearer ${supersignToken}`,
          "x-account-id": supersignAccountId,
        },
      });

      if (envelopeRes.ok) {
        const envelopeData = await envelopeRes.json();
        const signedFileKey = envelopeData.signedFileKey || envelopeData.signed_file_key;

        if (signedFileKey) {
          // Download the signed PDF
          const pdfRes = await fetch(`${SUPERSIGN_API}/v2/envelopes/${envelopeId}/documents/signed`, {
            headers: {
              Authorization: `Bearer ${supersignToken}`,
              "x-account-id": supersignAccountId,
            },
          });

          if (pdfRes.ok) {
            const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());
            const storagePath = `documents/${sig.clinic_id}/signed_${Date.now()}.pdf`;

            // Upload signed PDF to storage
            const { error: uploadErr } = await supabase.storage
              .from("exams")
              .upload(storagePath, pdfBuffer, {
                contentType: "application/pdf",
                upsert: true,
              });

            if (!uploadErr) {
              const { data: urlData } = supabase.storage
                .from("exams")
                .getPublicUrl(storagePath);
              signedPdfUrl = urlData.publicUrl;

              // Create exam record
              const { data: exam, error: examError } = await supabase
                .from("exams")
                .insert({
                  patient_id: sig.patient_id,
                  name: `${sig.title} (Assinado)`,
                  order_date: new Date().toISOString().split("T")[0],
                  file_urls: [signedPdfUrl],
                  file_type: "signed_document",
                })
                .select("id")
                .single();

              if (!examError && exam) {
                examId = exam.id;
              } else {
                logger.warn("Failed to create exam record", { error: examError?.message });
              }
            } else {
              logger.warn("Failed to upload signed PDF", { error: uploadErr.message });
            }
          }
        }
      }
    }

    // Update signature record
    const updates: Record<string, any> = {
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      dentist_status: "SIGNED",
    };

    if (signedPdfUrl) updates.signed_pdf_url = signedPdfUrl;
    if (examId) updates.exam_id = examId;
    if (sig.patient_status) updates.patient_status = "SIGNED";

    await supabase
      .from("digital_signatures")
      .update(updates)
      .eq("id", sig.id);

    logger.audit(supabase, {
      action: "DIGITAL_SIGNATURE_COMPLETED",
      table_name: "digital_signatures",
      record_id: sig.id,
      user_id: sig.created_by,
      clinic_id: sig.clinic_id,
      details: { envelope_id: envelopeId, has_signed_pdf: !!signedPdfUrl, exam_id: examId },
    });

    logger.info("Envelope completed successfully", { signatureId: sig.id, examId });

    // Notify dentist via email when patient has signed
    if (sig.patient_status) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const { data: dentist } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", sig.created_by)
            .single();

          const { data: patient } = await supabase
            .from("patients")
            .select("name")
            .eq("id", sig.patient_id)
            .single();

          if (dentist?.email) {
            const dentistName = dentist.full_name || "Doutor(a)";
            const patientName = patient?.name || "Paciente";
            const downloadUrl = signedPdfUrl || "";

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "Organiza Odonto <onboarding@resend.dev>",
                to: [dentist.email],
                subject: `Documento assinado: ${sig.title}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Olá, ${dentistName}!</h2>
                    <p>O paciente <strong>${patientName}</strong> assinou o documento <strong>${sig.title}</strong>.</p>
                    <p>O documento foi concluído com todas as assinaturas necessárias.</p>
                    ${downloadUrl ? `
                    <a href="${downloadUrl}" style="background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
                      Baixar PDF Assinado
                    </a>
                    ` : ""}
                    <p style="margin-top: 32px; color: #666; font-size: 14px;">
                      Este é um email automático do Organiza Odonto.
                    </p>
                  </div>
                `,
              }),
            });

            logger.info("Dentist notification email sent", { to: dentist.email, signatureId: sig.id });
          }
        }
      } catch (emailErr) {
        logger.warn("Failed to send dentist notification email", { error: String(emailErr) });
      }
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Webhook processing failed", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
