import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { extractBearerToken, validateUUID, ValidationError } from "../_shared/validation.ts";
import { createLogger } from "../_shared/logger.ts";
import { computeRecordHash } from "../_shared/contentHash.ts";

const FUNCTION_NAME = "batch-signature-create";
const SUPERSIGN_API = "https://api.sign.supersign.com.br";

interface BatchRecord {
  record_type: string;
  record_id: string;
}

interface ResolvedRecord extends BatchRecord {
  patient_name: string;
  record_date: string;
  description: string;
  content_hash: string;
}

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function getRecordTypeLabel(type: string): string {
  switch (type) {
    case "procedure": return "Procedimento";
    case "anamnesis": return "Anamnese";
    case "exam": return "Exame";
    default: return type;
  }
}

/** Generate batch document number: LOTE-YYYY-MM-NNN */
async function generateBatchNumber(supabase: any, clinicId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `LOTE-${yearMonth}-`;

  const { count } = await supabase
    .from("clinical_record_signatures")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .like("batch_document_id", `${prefix}%`);

  const seq = (count || 0) + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/** Generate a simple HTML-based PDF content (SuperSign accepts HTML) */
function generateBatchHtml(
  batchNumber: string,
  dentistName: string,
  dentistCro: string,
  records: ResolvedRecord[],
  batchHash: string,
  batchId: string,
): string {
  const now = new Date().toISOString();

  const procedureCount = records.filter(r => r.record_type === "procedure").length;
  const anamnesisCount = records.filter(r => r.record_type === "anamnesis").length;
  const examCount = records.filter(r => r.record_type === "exam").length;

  const rows = records.map((r, i) => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px;">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:8px;">${escapeHtml(r.patient_name)}</td>
      <td style="border:1px solid #ddd;padding:8px;">${escapeHtml(r.record_date)}</td>
      <td style="border:1px solid #ddd;padding:8px;">${escapeHtml(getRecordTypeLabel(r.record_type))}</td>
      <td style="border:1px solid #ddd;padding:8px;">${escapeHtml(r.description)}</td>
      <td style="border:1px solid #ddd;padding:8px;font-family:monospace;font-size:10px;">${escapeHtml(r.content_hash.slice(0, 16))}...</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>${batchNumber}</title></head>
    <body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;">
      <h1 style="color:#0D9488;text-align:center;">Lote de Assinaturas Digitais</h1>
      <table style="width:100%;margin:16px 0;">
        <tr><td><strong>Número:</strong></td><td>${escapeHtml(batchNumber)}</td></tr>
        <tr><td><strong>Dentista:</strong></td><td>${escapeHtml(dentistName)} — CRO ${escapeHtml(dentistCro)}</td></tr>
        <tr><td><strong>Data/Hora:</strong></td><td>${now}</td></tr>
        <tr><td><strong>Algoritmo:</strong></td><td>SHA-256</td></tr>
        <tr><td><strong>ID Único:</strong></td><td style="font-family:monospace;">${batchId}</td></tr>
      </table>

      <h2>Registros (${records.length})</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="border:1px solid #ddd;padding:8px;">#</th>
            <th style="border:1px solid #ddd;padding:8px;">Paciente</th>
            <th style="border:1px solid #ddd;padding:8px;">Data</th>
            <th style="border:1px solid #ddd;padding:8px;">Tipo</th>
            <th style="border:1px solid #ddd;padding:8px;">Descrição</th>
            <th style="border:1px solid #ddd;padding:8px;">Hash</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <h3>Totais por Tipo</h3>
      <ul>
        ${procedureCount > 0 ? `<li>Procedimentos: ${procedureCount}</li>` : ""}
        ${anamnesisCount > 0 ? `<li>Anamneses: ${anamnesisCount}</li>` : ""}
        ${examCount > 0 ? `<li>Exames: ${examCount}</li>` : ""}
      </ul>

      <hr style="margin:24px 0;" />
      <p style="text-align:center;color:#666;font-size:12px;">
        Hash do Documento: <code>${batchHash}</code>
      </p>
      <p style="text-align:center;color:#999;font-size:11px;">
        Documento gerado automaticamente — Organiza Odonto<br/>
        Base legal: MP 2.200-2/2001, Lei 14.063/2020, CFO 118/2012
      </p>
    </body>
    </html>
  `;
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
    const clinicId = validateUUID(body.clinic_id, "clinic_id");
    const records: BatchRecord[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      throw new ValidationError("Selecione ao menos um registro.");
    }
    if (records.length > 200) {
      throw new ValidationError("Máximo de 200 registros por lote.");
    }

    // Verify user is dentist/admin
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single();

    if (!clinicUser || !["admin", "dentist"].includes(clinicUser.role)) {
      throw new ValidationError("Apenas dentistas e administradores");
    }

    // Get dentist profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, cro")
      .eq("id", user.id)
      .single();

    const dentistName = profile?.full_name || "Dentista";
    const dentistCro = profile?.cro || "N/A";

    // Resolve all records
    const resolvedRecords: ResolvedRecord[] = [];
    for (const rec of records) {
      const table = rec.record_type === "procedure" ? "procedures"
        : rec.record_type === "anamnesis" ? "anamneses"
        : "exams";

      const { data: row } = await supabase
        .from(table)
        .select("*")
        .eq("id", rec.record_id)
        .single();

      if (!row) {
        log.warn("Record not found, skipping", { record_type: rec.record_type, record_id: rec.record_id });
        continue;
      }

      const { data: patient } = await supabase
        .from("patients")
        .select("name")
        .eq("id", row.patient_id)
        .single();

      const hash = await computeRecordHash(row as Record<string, unknown>, rec.record_type);

      resolvedRecords.push({
        record_type: rec.record_type,
        record_id: rec.record_id,
        patient_name: patient?.name || "Paciente",
        record_date: row.date || row.order_date || "",
        description: row.description || row.name || getRecordTypeLabel(rec.record_type),
        content_hash: hash,
      });
    }

    if (resolvedRecords.length === 0) {
      throw new ValidationError("Nenhum registro válido encontrado.");
    }

    // Generate batch identifiers
    const batchId = crypto.randomUUID();
    const batchNumber = await generateBatchNumber(supabase, clinicId);

    // Compute batch hash (hash of all record hashes)
    const allHashes = resolvedRecords.map(r => r.content_hash).join("|");
    const encoder = new TextEncoder();
    const batchHashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(allHashes));
    const batchHash = Array.from(new Uint8Array(batchHashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate HTML document
    const htmlContent = generateBatchHtml(
      batchNumber, dentistName, dentistCro,
      resolvedRecords, batchHash, batchId,
    );

    // Upload HTML to storage
    const storagePath = `batches/${clinicId}/${batchNumber.replace(/\//g, "-")}.html`;
    await supabase.storage
      .from("signatures")
      .upload(storagePath, new TextEncoder().encode(htmlContent), {
        contentType: "text/html",
        upsert: false,
      });

    // Create SuperSign envelope
    const supersignToken = Deno.env.get("SUPERSIGN_API_TOKEN");
    const supersignAccountId = Deno.env.get("SUPERSIGN_ACCOUNT_ID");
    let signingUrl: string | null = null;

    if (supersignToken && supersignAccountId) {
      try {
        // Create envelope
        const envelopeRes = await fetch(`${SUPERSIGN_API}/v2/envelopes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supersignToken}`,
            "x-account-id": supersignAccountId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `${batchNumber} — Lote de Prontuários`,
            message: `Lote de ${resolvedRecords.length} registros clínicos para assinatura ICP-Brasil.`,
            metadata: {
              batch: true,
              batch_id: batchId,
              batch_number: batchNumber,
              clinic_id: clinicId,
              dentist_user_id: user.id,
              record_count: resolvedRecords.length,
              records: resolvedRecords.map(r => ({
                record_type: r.record_type,
                record_id: r.record_id,
                content_hash: r.content_hash,
              })),
            },
            signers: [{
              name: dentistName,
              email: user.email,
              signatureType: "ICP_BRASIL",
            }],
            documents: [{
              name: `${batchNumber}.html`,
              content: btoa(htmlContent),
              contentType: "text/html",
            }],
          }),
        });

        if (envelopeRes.ok) {
          const envelopeData = await envelopeRes.json();
          signingUrl = envelopeData.signingUrl || envelopeData.signing_url || null;

          log.info("SuperSign envelope created", {
            envelopeId: envelopeData.id,
            batchNumber,
          });
        } else {
          const errData = await envelopeRes.text();
          log.error("SuperSign envelope creation failed", { error: errData });
        }
      } catch (err) {
        log.error("SuperSign API error", { error: String(err) });
      }
    } else {
      log.warn("SuperSign not configured — batch created without ICP signature");
    }

    log.audit(supabase, {
      action: "BATCH_SIGNATURE_CREATED",
      table_name: "clinical_record_signatures",
      record_id: batchId,
      user_id: user.id,
      clinic_id: clinicId,
      details: {
        batch_number: batchNumber,
        record_count: resolvedRecords.length,
        batch_hash: batchHash,
        has_supersign: !!signingUrl,
      },
    });

    return new Response(
      JSON.stringify({
        batch_id: batchId,
        batch_number: batchNumber,
        batch_hash: batchHash,
        record_count: resolvedRecords.length,
        signing_url: signingUrl,
        storage_path: storagePath,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, FUNCTION_NAME);
  }
});
