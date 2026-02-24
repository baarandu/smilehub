import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { extractBearerToken, validateUUID } from "../_shared/validation.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { checkAiConsent } from "../_shared/consent.ts";
import { createLogger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("voice-consultation-transcribe", req);

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

    // Rate limit: 10 requests per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "voice-consultation-transcribe",
      maxRequests: 10,
      windowMinutes: 60,
    });

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const sessionId = formData.get("session_id") as string;
    const clinicId = formData.get("clinic_id") as string;

    if (!audioFile) throw new Error("No audio file provided");
    validateUUID(sessionId, "session_id");
    validateUUID(clinicId, "clinic_id");

    // Verify user belongs to clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!clinicUser) throw new Error("User not authorized for this clinic");

    // Check AI consent for existing patients (LGPD Art. 6-7)
    const { data: sessionData } = await supabase
      .from("voice_consultation_sessions")
      .select("patient_id, is_new_patient")
      .eq("id", sessionId)
      .single();

    if (sessionData && !sessionData.is_new_patient && sessionData.patient_id) {
      const hasConsent = await checkAiConsent(supabase, sessionData.patient_id, clinicId);
      if (!hasConsent) {
        log.audit(supabase, {
          action: "CONSENT_DENIED", table_name: "Patient", record_id: sessionData.patient_id,
          user_id: user.id, clinic_id: clinicId, details: { reason: "AI consent not granted" },
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

    // Update session status
    await supabase
      .from("voice_consultation_sessions")
      .update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Send to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile, "recording.webm");
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "pt");
    whisperFormData.append("response_format", "verbose_json");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: whisperFormData,
      }
    );

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      logError("voice-consultation-transcribe", "Whisper API error", errorText);
      throw new Error("Erro no serviço de transcrição. Tente novamente.");
    }

    const whisperResult = await whisperResponse.json();
    const transcriptionText = whisperResult.text || "";
    const durationSeconds = Math.round(whisperResult.duration || 0);

    // Update session with encrypted transcription via RPC
    const { error: encryptError } = await supabase.rpc('encrypt_voice_transcription', {
      p_session_id: sessionId,
      p_transcription: transcriptionText,
    });

    if (encryptError) {
      log.error("Encryption RPC failed — refusing to store plaintext (LGPD)", {
        error: encryptError.message,
        session_id: sessionId,
      });
      await supabase
        .from("voice_consultation_sessions")
        .update({
          status: "error",
          processing_error: "Falha na criptografia da transcrição. Dados não armazenados por segurança.",
        })
        .eq("id", sessionId);
      throw new Error("Erro ao criptografar transcrição. Tente novamente.");
    }

    // Always update duration
    await supabase
      .from("voice_consultation_sessions")
      .update({ audio_duration_seconds: durationSeconds })
      .eq("id", sessionId);

    // Audit: AI request (Whisper)
    log.audit(supabase, {
      action: "AI_REQUEST", table_name: "VoiceTranscription", record_id: sessionId,
      user_id: user.id, clinic_id: clinicId,
      details: { model: "whisper-1", duration_seconds: durationSeconds },
    });

    return new Response(
      JSON.stringify({
        text: transcriptionText,
        duration_seconds: durationSeconds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, "voice-consultation-transcribe");
  }
});
