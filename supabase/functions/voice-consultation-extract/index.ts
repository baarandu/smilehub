import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  extractBearerToken,
  validateUUID,
  validateRequired,
  validateMaxLength,
} from "../_shared/validation.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { checkForInjection } from "../_shared/aiSanitizer.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { checkAiConsent } from "../_shared/consent.ts";

const EXTRACTION_PROMPT = `Você é um assistente de IA para uma clínica odontológica brasileira. Sua tarefa é extrair dados estruturados de uma transcrição de consulta odontológica.

REGRAS CRÍTICAS:
1. Extraia APENAS informações que foram EXPLICITAMENTE mencionadas na transcrição.
2. Use null para qualquer campo não mencionado — NUNCA invente dados.
3. Para campos booleanos da anamnese:
   - true = paciente CONFIRMOU ter a condição
   - false = paciente NEGOU ter a condição
   - null = condição NÃO FOI perguntada/mencionada
4. Diferencie a fala do dentista da fala do paciente pelo contexto.
5. Formate automaticamente: CPF (000.000.000-00), telefone ((11) 99999-9999), datas (YYYY-MM-DD).
6. Para paciente EXISTENTE: retorne apenas campos que tiveram informação nova ou diferente.

FORMATO DE SAÍDA (JSON):
{
  "patient": {
    "name": string | null,
    "phone": string | null,
    "email": string | null,
    "birthDate": string | null (YYYY-MM-DD),
    "cpf": string | null,
    "rg": string | null,
    "address": string | null,
    "city": string | null,
    "state": string | null,
    "zipCode": string | null,
    "occupation": string | null,
    "emergencyContact": string | null,
    "emergencyPhone": string | null,
    "healthInsurance": string | null,
    "healthInsuranceNumber": string | null,
    "allergies": string | null,
    "medications": string | null
  },
  "anamnesis": {
    "medicalTreatment": { "value": bool|null, "details": string|null },
    "recentSurgery": { "value": bool|null, "details": string|null },
    "healingProblems": { "value": bool|null, "details": string|null },
    "respiratoryProblems": { "value": bool|null, "details": string|null },
    "currentMedication": { "value": bool|null, "details": string|null },
    "allergy": { "value": bool|null, "details": string|null },
    "drugAllergy": { "value": bool|null, "details": string|null },
    "continuousMedication": { "value": bool|null, "details": string|null },
    "localAnesthesiaHistory": { "value": bool|null, "details": string|null },
    "anesthesiaReaction": { "value": bool|null, "details": string|null },
    "pregnantOrBreastfeeding": { "value": bool|null, "details": string|null },
    "smokerOrDrinker": { "value": bool|null, "details": string|null },
    "fasting": { "value": bool|null, "details": string|null },
    "diabetes": { "value": bool|null, "details": string|null },
    "depressionAnxietyPanic": { "value": bool|null, "details": string|null },
    "seizureEpilepsy": { "value": bool|null, "details": string|null },
    "heartDisease": { "value": bool|null, "details": string|null },
    "hypertension": { "value": bool|null, "details": string|null },
    "pacemaker": { "value": bool|null, "details": string|null },
    "infectiousDisease": { "value": bool|null, "details": string|null },
    "arthritis": { "value": bool|null, "details": string|null },
    "gastritisReflux": { "value": bool|null, "details": string|null },
    "bruxismDtmOrofacialPain": { "value": bool|null, "details": string|null },
    "notes": string | null,
    "observations": string | null
  },
  "consultation": {
    "chiefComplaint": string | null,
    "procedures": string | null,
    "treatmentPlan": string | null,
    "suggestedReturnDate": string | null (YYYY-MM-DD),
    "notes": string | null
  },
  "confidence": {
    "patient": "high" | "medium" | "low",
    "anamnesis": "high" | "medium" | "low",
    "consultation": "high" | "medium" | "low"
  }
}`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Auth
    const token = extractBearerToken(req.headers.get("Authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Rate limit: 20 requests per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "voice-consultation-extract",
      maxRequests: 20,
      windowMinutes: 60,
    });

    const body = await req.json();
    const {
      transcription,
      is_new_patient,
      existing_patient_data,
      existing_anamnesis_data,
      session_id,
      clinic_id,
    } = body;

    // Validate inputs
    validateRequired(transcription, "transcription");
    validateMaxLength(transcription, 15000, "transcription");
    if (clinic_id) validateUUID(clinic_id, "clinic_id");
    if (session_id) validateUUID(session_id, "session_id");

    // Check for prompt injection (log-only mode)
    checkForInjection(transcription, {
      functionName: "voice-consultation-extract",
      userId: user.id,
      clinicId: clinic_id,
    });

    // Verify user belongs to clinic
    if (clinic_id) {
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("role")
        .eq("clinic_id", clinic_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicUser) throw new Error("User not authorized for this clinic");
    }

    // Check AI consent for existing patients (LGPD Art. 6-7)
    if (!is_new_patient && existing_patient_data?.id && clinic_id) {
      const hasConsent = await checkAiConsent(supabase, existing_patient_data.id, clinic_id);
      if (!hasConsent) {
        return new Response(
          JSON.stringify({
            error: "Paciente não consentiu com análise por IA. Registre o consentimento na ficha do paciente.",
            consent_required: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }
    }

    // Build user message
    let userMessage = `TRANSCRIÇÃO DA CONSULTA:\n\n${transcription}`;

    if (!is_new_patient && existing_patient_data) {
      userMessage += `\n\nDADOS ATUAIS DO PACIENTE (retorne apenas campos alterados):\n${JSON.stringify(existing_patient_data, null, 2)}`;
    }

    if (!is_new_patient && existing_anamnesis_data) {
      userMessage += `\n\nANAMNESE ANTERIOR:\n${JSON.stringify(existing_anamnesis_data, null, 2)}`;
    }

    userMessage += `\n\nTIPO: ${is_new_patient ? "Paciente NOVO — extraia todos os dados mencionados" : "Paciente EXISTENTE — retorne apenas dados novos ou alterados"}`;

    // Call GPT-4o-mini
    const gptResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: EXTRACTION_PROMPT },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 4000,
        }),
      }
    );

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      logError("voice-consultation-extract", "GPT API error", errorText);
      throw new Error("Erro no serviço de extração. Tente novamente.");
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;
    const tokensUsed = gptResult.usage?.total_tokens || 0;

    if (!content) throw new Error("No content in GPT response");

    const extractedData = JSON.parse(content);

    // Update session with extracted data
    if (session_id) {
      await supabase
        .from("voice_consultation_sessions")
        .update({
          status: "review",
          extracted_patient_data: extractedData.patient,
          extracted_anamnesis_data: extractedData.anamnesis,
          extracted_consultation_data: extractedData.consultation,
          processing_completed_at: new Date().toISOString(),
          gpt_tokens_used: tokensUsed,
        })
        .eq("id", session_id);
    }

    return new Response(
      JSON.stringify({
        data: extractedData,
        tokens_used: tokensUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, "voice-consultation-extract");
  }
});
