
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  extractBearerToken,
  validateRequired,
  validateMaxLength,
} from "../_shared/validation.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { checkForInjection } from "../_shared/aiSanitizer.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Auth
    const token = extractBearerToken(req.headers.get("Authorization"));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Rate limit: 60 requests per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "ai-secretary",
      maxRequests: 60,
      windowMinutes: 60,
    });

    const { message, history } = await req.json();

    validateRequired(message, "message");
    validateMaxLength(message, 2000, "message");

    // Check for prompt injection
    checkForInjection(message, {
      functionName: "ai-secretary",
      userId: user.id,
    });

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = `Você é uma secretária virtual eficiente e amigável da clínica "Organiza Odonto". Ajude o dentista com informações rápidas. Responda em português do Brasil de forma concisa.`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // Add history (limit to last 20 messages, truncate each)
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-20)) {
        const role = msg.sender === "user" ? "user" : "assistant";
        if (msg.text && typeof msg.text === "string") {
          messages.push({ role, content: msg.text.slice(0, 2000) });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logError(
        "ai-secretary",
        `OpenAI API error (${response.status})`,
        errorText
      );
      if (response.status === 429) {
        throw new Error(
          "O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos."
        );
      }
      throw new Error("Erro no serviço de IA. Tente novamente.");
    }

    const data = await response.json();
    const aiMessage =
      data.choices?.[0]?.message?.content || "Desculpe, não entendi.";

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return createErrorResponse(error, corsHeaders, "ai-secretary");
  }
});
