import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { TOOLS } from "./tools.ts";
import { executeToolCall } from "./toolExecutors.ts";
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
import { createLogger } from "../_shared/logger.ts";

// Convert tools to OpenAI format
function getOpenAITools() {
  return TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("accounting-agent");

  try {
    const t0 = Date.now();

    // Extract and validate JWT token
    const token = extractBearerToken(req.headers.get("Authorization"));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role key to bypass RLS for admin checks
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify user is authenticated by passing the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System", details: { reason: "Invalid token" } });
      throw new Error("Unauthorized");
    }

    // Rate limit: 40 requests per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "accounting-agent",
      maxRequests: 40,
      windowMinutes: 60,
    });

    // Parse and validate request body
    const { conversation_id, message, clinic_id } = await req.json();

    validateRequired(message, "message");
    validateMaxLength(message, 4000, "message");
    validateUUID(clinic_id, "clinic_id");
    if (conversation_id) validateUUID(conversation_id, "conversation_id");

    // Check for prompt injection (blocking mode for clinical functions)
    requireSafeInput(message, {
      functionName: "accounting-agent",
      userId: user.id,
      clinicId: clinic_id,
    });

    // Verify user is admin of the clinic
    const { data: clinicUser, error: clinicUserError } = await supabase
      .from("clinic_users")
      .select("role, clinic_id, user_id")
      .eq("clinic_id", clinic_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (clinicUserError || !clinicUser || clinicUser.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Get fiscal profile for system prompt
    const { data: fiscalProfile } = await supabase
      .from("fiscal_profiles")
      .select("*")
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    log.debug(`Auth + profile: ${Date.now() - t0}ms`);

    // Get or create conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from("accounting_agent_conversations")
        .insert({
          clinic_id,
          user_id: user.id,
          title: message.substring(0, 100),
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = newConv.id;
    }

    // Get conversation history (limit to last 10 to reduce token usage)
    const { data: history, error: historyError } = await supabase
      .from("accounting_agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    if (historyError) throw historyError;

    // Save user message
    const { error: saveUserMsgError } = await supabase
      .from("accounting_agent_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      });

    if (saveUserMsgError) throw saveUserMsgError;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(fiscalProfile);

    // Prepare messages for OpenAI
    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add history
    for (const msg of history || []) {
      if (msg.role === "user") {
        openaiMessages.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        const assistantMsg: any = { role: "assistant" };
        if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          assistantMsg.content = msg.content || null;
          assistantMsg.tool_calls = msg.tool_calls.map((tc: any) => ({
            id: tc.id || `call_${tc.name}`,
            type: "function",
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments),
            },
          }));
        } else {
          assistantMsg.content = msg.content;
        }
        openaiMessages.push(assistantMsg);
      } else if (msg.role === "tool") {
        openaiMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id || `call_${msg.tool_name || "unknown"}`,
          content: msg.content,
        });
      }
    }

    // Add current user message
    openaiMessages.push({ role: "user", content: message });

    // Call OpenAI API
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    log.debug(`Pre-OpenAI: ${Date.now() - t0}ms`);

    const openaiResponse = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          tools: getOpenAITools(),
          temperature: 0.5,
          max_tokens: 1500,
        }),
      },
      25000
    );

    log.debug(`First OpenAI call: ${Date.now() - t0}ms`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logError("accounting-agent", `OpenAI API error (${openaiResponse.status})`, errorText);
      if (openaiResponse.status === 429) {
        throw new Error("O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.");
      }
      if (openaiResponse.status === 401) {
        throw new Error("Erro de configuração do serviço de IA. Contacte o suporte.");
      }
      throw new Error("Erro no serviço de IA. Tente novamente.");
    }

    const openaiData = await openaiResponse.json();
    const choice = openaiData.choices?.[0];

    if (!choice) {
      throw new Error("No response from OpenAI");
    }

    let responseText = choice.message?.content || "";
    const toolCalls: any[] = [];

    // Check if there are tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      for (const tc of choice.message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        });
      }
    }

    // If there are tool calls, execute them
    if (toolCalls.length > 0) {
      // Save assistant message with tool calls
      await supabase
        .from("accounting_agent_messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: responseText || "Executando ferramentas...",
          tool_calls: toolCalls,
        });

      // Execute each tool call and add results
      const toolMessages: any[] = [];
      for (const toolCall of toolCalls) {
        try {
          log.debug(`Executing tool ${toolCall.name}: ${Date.now() - t0}ms`);
          const result = await executeToolCall(
            toolCall.name,
            toolCall.arguments,
            clinic_id,
            supabase
          );

          const resultStr = JSON.stringify(result);
          log.debug(`Tool ${toolCall.name} done: ${Date.now() - t0}ms (${resultStr.length} chars)`);

          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultStr,
          });

          // Save tool result
          await supabase
            .from("accounting_agent_messages")
            .insert({
              conversation_id: conversationId,
              role: "tool",
              tool_name: toolCall.name,
              tool_call_id: toolCall.id,
              content: resultStr,
            });
        } catch (error: any) {
          console.error(`Error executing tool ${toolCall.name}:`, error);
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          });
        }
      }

      // Make second call to OpenAI with tool results (no tools needed this time)
      const secondMessages = [
        ...openaiMessages,
        {
          role: "assistant",
          content: responseText || null,
          tool_calls: choice.message.tool_calls,
        },
        ...toolMessages,
      ];

      log.debug(`Pre-second OpenAI: ${Date.now() - t0}ms`);

      const secondResponse = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: secondMessages,
            temperature: 0.5,
            max_tokens: 1500,
          }),
        },
        25000
      );

      log.debug(`Second OpenAI call: ${Date.now() - t0}ms`);

      if (!secondResponse.ok) {
        const errText = await secondResponse.text();
        logError("accounting-agent", `Second OpenAI call error (${secondResponse.status})`, errText);
        if (secondResponse.status === 429) {
          throw new Error("O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.");
        }
        throw new Error("Erro no serviço de IA. Tente novamente.");
      }

      const secondData = await secondResponse.json();
      const secondChoice = secondData.choices?.[0];
      responseText = secondChoice?.message?.content || "Sem resposta.";
    }

    // Save final assistant response
    await supabase
      .from("accounting_agent_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: responseText,
      });

    log.info(`Request completed in ${Date.now() - t0}ms`);

    // Audit: AI request
    log.audit(supabase, {
      action: "AI_REQUEST", table_name: "AccountingAgent", record_id: conversationId,
      user_id: user.id, clinic_id,
      details: {
        model: "gpt-4o-mini",
        tools_used: toolCalls.map((tc: any) => tc.name),
      },
    });

    // Return response
    return new Response(
      JSON.stringify({
        conversation_id: conversationId,
        response: responseText,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return createErrorResponse(error, corsHeaders, "accounting-agent");
  }
});
