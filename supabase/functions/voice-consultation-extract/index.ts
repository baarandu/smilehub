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
import { requireSafeInput } from "../_shared/aiSanitizer.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { checkAiConsent } from "../_shared/consent.ts";
import { createLogger } from "../_shared/logger.ts";

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

REGRAS PARA PROCEDIMENTOS (procedures):
- Extraia cada procedimento mencionado como item separado.
- "realizei"/"fiz"/"executei" → status "completed"
- "iniciei"/"comecei" → status "in_progress"
- "precisa"/"agendado"/"necessita" → status "pending"
- Dentes FDI: 11-18, 21-28, 31-38, 41-48 (permanentes); 51-55, 61-65, 71-75, 81-85 (decíduos).
- Tratamentos válidos: Avaliação, Bloco, Canal, Clareamento, Coroa, Extração, Faceta, Implante, Limpeza, Outros, Pino, Prótese Removível, Radiografia, Raspagem Subgengival, Restauração.
- Se o tratamento mencionado não se encaixa nos válidos, use "Outros" e coloque a descrição no campo description.
- Array vazio se nenhum procedimento mencionado.

REGRAS PARA ORÇAMENTO (budget):
- Identificar por palavras: "orçamento", "custo", "investimento", "valor", "R$", "reais".
- Valores em centavos (string): R$1.500 → "150000", R$200 → "20000".
- O campo values é um mapa de tratamento → valor em centavos: { "Restauração": "15000" }.
- Faces (M/D/O/V/L/P) relevantes apenas para Restauração.
- materials: mapa de tratamento → material: { "Restauração": "Z350" }.
- { items: [], location: null } se nenhum orçamento mencionado.

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
  "procedures": [
    {
      "description": string | null,
      "tooth": string | null (FDI number),
      "treatment": string | null (from valid list),
      "material": string | null,
      "status": "pending" | "in_progress" | "completed",
      "location": string | null
    }
  ],
  "budget": {
    "items": [
      {
        "tooth": string (FDI number),
        "treatments": string[] (from valid list),
        "values": { "treatment_name": "value_in_cents" },
        "faces": string[] (M/D/O/V/L/P, only for Restauração),
        "materials": { "treatment_name": "material_name" }
      }
    ],
    "location": string | null
  },
  "confidence": {
    "patient": "high" | "medium" | "low",
    "anamnesis": "high" | "medium" | "low",
    "consultation": "high" | "medium" | "low",
    "procedures": "high" | "medium" | "low",
    "budget": "high" | "medium" | "low"
  }
}`;

const CHILD_EXTRACTION_PROMPT = `Você é um assistente de IA para uma clínica odontológica pediátrica brasileira. Sua tarefa é extrair dados estruturados de uma transcrição de anamnese odontopediátrica.

REGRAS CRÍTICAS:
1. Extraia APENAS informações que foram EXPLICITAMENTE mencionadas na transcrição.
2. Use null para qualquer campo não mencionado — NUNCA invente dados.
3. Para campos booleanos:
   - true = responsável CONFIRMOU a condição
   - false = responsável NEGOU a condição
   - null = condição NÃO FOI perguntada/mencionada
4. A conversa é tipicamente entre dentista e responsável (mãe/pai) sobre a criança.
5. Para campos com opções fixas (select), use EXATAMENTE os valores permitidos listados.

REGRAS PARA CAMPOS SELECT:
- pregnancyType: "a_termo" | "prematuro" | "pos_termo" | null
- birthType: "normal" | "cesarea" | null
- brushingBy: "crianca" | "pais" | "ambos" | null
- brushingFrequency: "1x" | "2x" | "3x_ou_mais" | null
- sugarFrequency: "raramente" | "1x_dia" | "2_3x_dia" | "varias_vezes" | null
- behavior: "cooperativo" | "ansioso" | "medroso" | "choroso" | "nao_cooperativo" | null
- dentition: "decidua" | "mista" | "permanente" | null
- facialSymmetry: "simetrica" | "assimetria" | null
- facialProfile: "convexo" | "reto" | "concavo" | null
- lipCompetence: "adequado" | "incompetente" | null
- breathingType: "nasal" | "bucal" | "mista" | null
- labialFrenum: "normal" | "alterado" | null
- lingualFrenum: "normal" | "curto_anquiloglossia" | null
- jugalMucosa: "normal" | "alterada" | null
- lips: "normais" | "alterados" | null
- gingiva: "saudavel" | "inflamada" | "sangramento" | null
- palate: "normal" | "atresico" | "ogival" | null
- tongue: "normal" | "saburrosa" | "geografica" | "outra" | null
- deglutition: "tipica" | "atipica" | null
- facialPattern: "mesofacial" | "dolico" | "braquifacial" | null
- angleClass: "I" | "II" | "III" | null
- crossbite: "nao" | "anterior" | "posterior" | null
- openBite: "nao" | "anterior" | "posterior" | null
- previousProcedures: array de "restauracao","extracao","endodontia","selante","fluor","ortodontia"

FORMATO DE SAÍDA (JSON):
{
  "childAnamnesis": {
    "pregnancyType": string|null,
    "birthType": string|null,
    "pregnancyComplications": { "value": bool|null, "details": string|null },
    "pregnancyMedications": { "value": bool|null, "details": string|null },
    "birthWeight": string|null,
    "exclusiveBreastfeedingDuration": string|null,
    "totalBreastfeedingDuration": string|null,
    "currentHealth": string|null,
    "chronicDisease": { "value": bool|null, "details": string|null },
    "hospitalized": { "value": bool|null, "details": string|null },
    "surgery": { "value": bool|null, "details": string|null },
    "respiratoryProblems": { "value": bool|null, "details": string|null },
    "cardiopathy": { "value": bool|null, "details": string|null },
    "continuousMedication": { "value": bool|null, "details": string|null },
    "frequentAntibiotics": { "value": bool|null, "details": string|null },
    "drugAllergy": { "value": bool|null, "details": string|null },
    "foodAllergy": { "value": bool|null, "details": string|null },
    "previousDentist": bool|null,
    "firstVisitAge": string|null,
    "lastDentalVisit": string|null,
    "lastVisitReason": string|null,
    "previousProcedures": string[]|null,
    "localAnesthesia": bool|null,
    "anesthesiaGoodReaction": bool|null,
    "anesthesiaAdverseReaction": string|null,
    "frequentCankerSores": bool|null,
    "dentalTrauma": { "value": bool|null, "details": string|null },
    "traumaAffectedTooth": string|null,
    "traumaReceivedTreatment": string|null,
    "chiefComplaint": string|null,
    "brushingBy": string|null,
    "brushingFrequency": string|null,
    "brushingStartAge": string|null,
    "hygieneInstruction": bool|null,
    "fluorideToothpaste": bool|null,
    "toothpasteBrand": string|null,
    "dentalFloss": { "value": bool|null, "details": string|null },
    "mouthwash": { "value": bool|null, "details": string|null },
    "wasBreastfed": bool|null,
    "usedBottle": { "value": bool|null, "details": string|null },
    "currentlyUsesBottle": bool|null,
    "usesPacifier": bool|null,
    "sugarFrequency": string|null,
    "sugarBeforeBed": bool|null,
    "sleepsAfterSugarLiquid": bool|null,
    "nailBiting": bool|null,
    "objectBiting": bool|null,
    "thumbSucking": bool|null,
    "prolongedPacifier": bool|null,
    "teethGrinding": { "value": bool|null, "details": string|null },
    "mouthBreathing": bool|null,
    "behavior": string|null,
    "managementTechniques": { "value": bool|null, "details": string|null },
    "dentition": string|null,
    "plaqueIndex": string|null,
    "cariesLesions": string|null,
    "visibleBiofilm": string|null,
    "gingivalChanges": string|null,
    "mucosaChanges": string|null,
    "occlusalChanges": string|null,
    "radiographyNeeded": string|null,
    "treatmentPlan": string|null,
    "facialSymmetry": string|null,
    "facialProfile": string|null,
    "lipCompetence": string|null,
    "palpableLymphNodes": { "value": bool|null, "details": string|null },
    "atm": string|null,
    "breathingType": string|null,
    "labialFrenum": string|null,
    "lingualFrenum": string|null,
    "jugalMucosa": string|null,
    "jugalMucosaDetails": string|null,
    "lips": string|null,
    "gingiva": string|null,
    "palate": string|null,
    "tongue": string|null,
    "tongueDetails": string|null,
    "oropharynxTonsils": string|null,
    "observedHygiene": string|null,
    "deglutition": string|null,
    "alteredPhonation": bool|null,
    "facialPattern": string|null,
    "angleClass": string|null,
    "crossbite": string|null,
    "openBite": string|null,
    "overjet": string|null,
    "overbite": string|null,
    "midlineDeviation": bool|null,
    "observations": string|null
  },
  "confidence": {
    "childAnamnesis": "high" | "medium" | "low"
  }
}`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("voice-consultation-extract", req);

  try {
    // Auth
    const token = extractBearerToken(req.headers.get("Authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System", details: { reason: "Invalid token" } });
      throw new Error("Unauthorized");
    }

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
      extraction_type,
    } = body;

    const isChildExtraction = extraction_type === "child";

    // Validate inputs
    validateRequired(transcription, "transcription");
    validateMaxLength(transcription, 15000, "transcription");
    if (clinic_id) validateUUID(clinic_id, "clinic_id");
    if (session_id) validateUUID(session_id, "session_id");

    // Check for prompt injection (blocking mode)
    requireSafeInput(transcription, {
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
        log.audit(supabase, {
          action: "CONSENT_DENIED", table_name: "Patient", record_id: existing_patient_data.id,
          user_id: user.id, clinic_id, details: { reason: "AI consent not granted" },
        });
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
    const systemPrompt = isChildExtraction ? CHILD_EXTRACTION_PROMPT : EXTRACTION_PROMPT;
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
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 6000,
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
          extracted_procedures_data: extractedData.procedures || [],
          extracted_budget_data: extractedData.budget || { items: [], location: null },
          processing_completed_at: new Date().toISOString(),
          gpt_tokens_used: tokensUsed,
        })
        .eq("id", session_id);
    }

    // Audit: AI request
    log.audit(supabase, {
      action: "AI_REQUEST", table_name: "VoiceExtraction", record_id: session_id,
      user_id: user.id, clinic_id,
      details: { model: "gpt-4o-mini", tokens_used: tokensUsed, is_new_patient, extraction_type: extraction_type || "adult" },
    });

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
