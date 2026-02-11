import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const sessionId = formData.get("session_id") as string;
    const clinicId = formData.get("clinic_id") as string;

    if (!audioFile) throw new Error("No audio file provided");
    if (!sessionId) throw new Error("No session_id provided");
    if (!clinicId) throw new Error("No clinic_id provided");

    // Verify user belongs to clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("role")
      .eq("clinic_id", clinicId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!clinicUser) throw new Error("User not authorized for this clinic");

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
      console.error("Whisper API error:", errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcriptionText = whisperResult.text || "";
    const durationSeconds = Math.round(whisperResult.duration || 0);

    // Update session with transcription
    await supabase
      .from("voice_consultation_sessions")
      .update({
        transcription: transcriptionText,
        audio_duration_seconds: durationSeconds,
      })
      .eq("id", sessionId);

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
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
