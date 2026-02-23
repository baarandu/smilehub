import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { extractBearerToken, validateUUID } from "../_shared/validation.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";

/**
 * Patient Data Export — LGPD Art. 18
 * Returns all data related to a patient in structured JSON format.
 * Includes: profile, anamneses, appointments, consultations, procedures,
 * exams, budgets, documents, financial transactions, voice sessions.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("patient-data-export", req);

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

    // Rate limit: 5 exports per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "patient-data-export",
      maxRequests: 5,
      windowMinutes: 60,
    });

    const body = await req.json();
    const { patientId, clinicId, format = "json" } = body;

    validateUUID(patientId, "patientId");
    validateUUID(clinicId, "clinicId");

    // Validate format
    const validFormats = ["json", "csv"];
    if (!validFormats.includes(format)) {
      throw new Error("Missing required fields");
    }

    // Verify user has access to this clinic
    const { data: clinicUser, error: accessError } = await supabase
      .from("clinic_users")
      .select("role, roles")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single();

    if (accessError || !clinicUser) {
      throw new Error("Unauthorized");
    }

    // Only admin and dentist can export patient data
    const userRoles: string[] = clinicUser.roles || (clinicUser.role ? [clinicUser.role] : []);
    if (!userRoles.some((r: string) => ["admin", "dentist"].includes(r))) {
      throw new Error("Unauthorized");
    }

    // Fetch patient profile (decrypted CPF/RG via view)
    const { data: patient, error: patientError } = await supabase
      .from("patients_secure")
      .select("*")
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .single();

    if (patientError || !patient) {
      throw new Error("Patient not found");
    }

    // Fetch all related data in parallel
    const [
      anamnesesResult,
      appointmentsResult,
      consultationsResult,
      proceduresResult,
      examsResult,
      budgetsResult,
      documentsResult,
      transactionsResult,
      voiceSessionsResult,
    ] = await Promise.all([
      supabase
        .from("anamneses")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId)
        .order("date", { ascending: false }),
      supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("procedures")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("exams")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("budgets")
        .select("*, budget_items(*)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("patient_documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("financial_transactions")
        .select("*")
        .eq("patient_id", patientId)
        .order("date", { ascending: false }),
      supabase
        .from("voice_consultation_sessions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]);

    // Build export object
    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.id,
        format_version: "1.0",
        lgpd_article: "Art. 18 — Direito de acesso aos dados",
      },
      patient: {
        ...patient,
        // Remove internal IDs from export
        clinic_id: undefined,
        user_id: undefined,
      },
      anamneses: anamnesesResult.data || [],
      appointments: (appointmentsResult.data || []).map((a: any) => ({
        ...a,
        clinic_id: undefined,
      })),
      consultations: consultationsResult.data || [],
      procedures: proceduresResult.data || [],
      exams: (examsResult.data || []).map((e: any) => ({
        ...e,
        // Keep file URLs for the patient
        file_url: e.file_url,
      })),
      budgets: budgetsResult.data || [],
      documents: documentsResult.data || [],
      financial_transactions: (transactionsResult.data || []).map((t: any) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        payment_method: t.payment_method,
      })),
      voice_consultation_sessions: (voiceSessionsResult.data || []).map((s: any) => ({
        id: s.id,
        status: s.status,
        transcription: s.transcription,
        extracted_data: s.extracted_data,
        created_at: s.created_at,
      })),
    };

    // Log the export in audit (fire-and-forget via structured logger)
    log.audit(supabase, {
      action: "EXPORT", table_name: "Patient", record_id: patientId,
      user_id: user.id, clinic_id: clinicId,
      details: { reason: "LGPD data export request", format },
    });

    if (format === "csv") {
      const csvContent = generateCSV(exportData);
      // BOM for UTF-8 Excel compatibility
      const bom = "\uFEFF";
      return new Response(
        bom + csvContent,
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="patient-data-${patientId.substring(0, 8)}.csv"`,
          },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify(exportData),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="patient-data-${patientId.substring(0, 8)}.json"`,
        },
        status: 200,
      }
    );
  } catch (error: unknown) {
    return createErrorResponse(error, corsHeaders, "patient-data-export");
  }
});

// --- CSV Helpers ---

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function objectToCSVRows(items: Record<string, unknown>[]): string {
  if (items.length === 0) return "(sem registros)\n";
  const headers = Object.keys(items[0]);
  const headerRow = headers.map(csvEscape).join(",");
  const dataRows = items.map((item) =>
    headers.map((h) => csvEscape(item[h])).join(",")
  );
  return [headerRow, ...dataRows].join("\n") + "\n";
}

function generateCSV(data: Record<string, unknown>): string {
  const sections: string[] = [];

  // Metadata
  sections.push("=== METADADOS DA EXPORTAÇÃO ===");
  const meta = data.export_metadata as Record<string, unknown>;
  sections.push(Object.entries(meta).map(([k, v]) => `${k},${csvEscape(v)}`).join("\n"));

  // Patient
  sections.push("\n=== DADOS DO PACIENTE ===");
  const patient = data.patient as Record<string, unknown>;
  sections.push(Object.entries(patient)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k},${csvEscape(v)}`)
    .join("\n"));

  // Sections with arrays
  const arraySections: [string, string][] = [
    ["anamneses", "ANAMNESES"],
    ["appointments", "CONSULTAS AGENDADAS"],
    ["consultations", "CONSULTAS"],
    ["procedures", "PROCEDIMENTOS"],
    ["exams", "EXAMES"],
    ["budgets", "ORÇAMENTOS"],
    ["documents", "DOCUMENTOS"],
    ["financial_transactions", "TRANSAÇÕES FINANCEIRAS"],
    ["voice_consultation_sessions", "SESSÕES DE VOZ"],
  ];

  for (const [key, label] of arraySections) {
    const items = data[key] as Record<string, unknown>[];
    if (items && items.length > 0) {
      sections.push(`\n=== ${label} ===`);
      sections.push(objectToCSVRows(items));
    }
  }

  return sections.join("\n");
}
