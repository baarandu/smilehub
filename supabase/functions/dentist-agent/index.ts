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
  validateImageUrls,
} from "../_shared/validation.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { requireSafeInput } from "../_shared/aiSanitizer.ts";
import { checkAiConsent } from "../_shared/consent.ts";
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

// Sanitize message history to ensure no incomplete tool call sequences
// OpenAI requires: assistant(tool_calls) → tool(results for each call)
// If truncation breaks this sequence, we get a 400 error
function sanitizeHistory(messages: any[]): any[] {
  if (messages.length === 0) return messages;

  // Walk backwards to find if we're in the middle of a tool sequence
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (msg.role === "tool") {
      // We're inside a tool result sequence, keep scanning back
      continue;
    }

    if (msg.role === "assistant" && msg.tool_calls?.length > 0) {
      // Found the assistant that initiated tool calls
      // Check if ALL tool results are present after it
      const expectedCount = msg.tool_calls.length;
      let foundCount = 0;
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[j].role === "tool") {
          foundCount++;
        } else {
          break;
        }
      }

      if (foundCount < expectedCount) {
        // Incomplete sequence — truncate to before this assistant message
        console.warn(`[sanitize] Removing incomplete tool sequence at index ${i}: expected ${expectedCount} tool results, found ${foundCount}`);
        return messages.slice(0, i);
      }
      // Complete sequence, history is valid
      break;
    }

    // Regular assistant or user message — sequence is clean
    break;
  }

  return messages;
}

// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Convert image URL to base64 data URI so OpenAI receives the actual image data
// (avoids issues with OpenAI servers being unable to fetch Supabase Storage URLs)
async function imageUrlToDataUri(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[vision] Failed to fetch image (${response.status}): ${url}`);
      return url; // fallback to URL
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();
    // Skip if image is too large (>15MB)
    if (buffer.byteLength > 15 * 1024 * 1024) {
      console.warn(`[vision] Image too large (${buffer.byteLength} bytes), using URL`);
      return url;
    }
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch (error) {
    console.warn(`[vision] Error converting image: ${error}`);
    return url; // fallback to URL
  }
}

// Helper: calculate age from birth date
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("dentist-agent", req);

  try {
    const t0 = Date.now();

    // Extract and validate JWT token
    const token = extractBearerToken(req.headers.get("Authorization"));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System", details: { reason: "Invalid token" } });
      throw new Error("Unauthorized");
    }

    // Rate limit: 100 requests per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "dentist-agent",
      maxRequests: 100,
      windowMinutes: 60,
    });

    // Parse and validate request body
    const { conversation_id, message, clinic_id, patient_id, image_urls } =
      await req.json();

    validateRequired(message, "message");
    validateMaxLength(message, 4000, "message");
    validateUUID(clinic_id, "clinic_id");
    if (conversation_id) validateUUID(conversation_id, "conversation_id");
    if (patient_id) validateUUID(patient_id, "patient_id");
    const validatedImageUrls = validateImageUrls(image_urls);

    // Check for prompt injection (blocking mode for clinical functions)
    requireSafeInput(message, {
      functionName: "dentist-agent",
      userId: user.id,
      clinicId: clinic_id,
    });

    // Verify user is dentist or admin of the clinic
    const { data: clinicUser, error: clinicUserError } = await supabase
      .from("clinic_users")
      .select("role, roles, clinic_id, user_id")
      .eq("clinic_id", clinic_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const userRoles: string[] = clinicUser?.roles || (clinicUser?.role ? [clinicUser.role] : []);
    if (
      clinicUserError ||
      !clinicUser ||
      !userRoles.some((r: string) => ["admin", "dentist"].includes(r))
    ) {
      throw new Error("Unauthorized");
    }

    // Pre-fetch patient context if patient_id provided
    let patientSummary: string | undefined;
    if (patient_id) {
      // Check AI consent before loading patient data (LGPD Art. 6-7)
      const hasConsent = await checkAiConsent(supabase, patient_id, clinic_id);
      if (!hasConsent) {
        log.audit(supabase, {
          action: "CONSENT_DENIED", table_name: "Patient", record_id: patient_id,
          user_id: user.id, clinic_id, details: { reason: "AI consent not granted" },
        });
        return new Response(
          JSON.stringify({
            response: "Este paciente ainda não consentiu com a análise de dados por IA. " +
              "Para utilizar o assistente com contexto do paciente, registre o consentimento " +
              "na ficha do paciente em 'Consentimento IA'.",
            consent_required: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("name, birth_date, allergies, medications, health_insurance")
        .eq("id", patient_id)
        .eq("clinic_id", clinic_id)
        .single();

      if (patientError) {
        logError("dentist-agent", "Error fetching patient context", patientError.message);
      }

      if (patientData) {
        log.audit(supabase, {
          action: "READ", table_name: "Patient", record_id: patient_id,
          user_id: user.id, clinic_id, details: { context: "dentist-agent patient context" },
        });
        const age = patientData.birth_date
          ? calculateAge(patientData.birth_date)
          : null;
        patientSummary = [
          `Paciente: [contexto ativo]`,
          age !== null ? `Idade: ${age} anos` : null,
          patientData.allergies ? `Alergias: ${patientData.allergies}` : null,
          patientData.medications
            ? `Medicações: ${patientData.medications}`
            : null,
          patientData.health_insurance
            ? `Convênio: ${patientData.health_insurance}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    log.debug(`Auth + patient context: ${Date.now() - t0}ms`);

    // Get or create conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from("dentist_agent_conversations")
        .insert({
          clinic_id,
          user_id: user.id,
          patient_id: patient_id || null,
          title: message.substring(0, 100),
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = newConv.id;
    }

    // Get conversation history (last 20 messages — balances context vs token usage)
    const { data: history, error: historyError } = await supabase
      .from("dentist_agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyError) throw historyError;

    // Save user message (with image_urls if present)
    const { error: saveUserMsgError } = await supabase
      .from("dentist_agent_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
        image_urls: validatedImageUrls.length ? validatedImageUrls : null,
      });

    if (saveUserMsgError) throw saveUserMsgError;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(patientSummary, patient_id || undefined);

    // Prepare messages for OpenAI
    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add history, reconstructing multi-part content for messages with images
    // Convert history images to base64 to ensure OpenAI can access them in follow-ups
    for (const msg of history || []) {
      if (msg.role === "user") {
        if (msg.image_urls?.length) {
          const historyBase64Urls = await Promise.all(
            msg.image_urls.map((url: string) => imageUrlToDataUri(url))
          );
          openaiMessages.push({
            role: "user",
            content: [
              { type: "text", text: msg.content },
              ...historyBase64Urls.map((url: string) => ({
                type: "image_url",
                image_url: { url, detail: "high" },
              })),
            ],
          });
        } else {
          openaiMessages.push({ role: "user", content: msg.content });
        }
      } else if (msg.role === "assistant") {
        const assistantMsg: any = { role: "assistant" };
        if (
          msg.tool_calls &&
          Array.isArray(msg.tool_calls) &&
          msg.tool_calls.length > 0
        ) {
          assistantMsg.content = msg.content || null;
          assistantMsg.tool_calls = msg.tool_calls.map((tc: any) => ({
            id: tc.id || `call_${tc.name}`,
            type: "function",
            function: {
              name: tc.name,
              arguments:
                typeof tc.arguments === "string"
                  ? tc.arguments
                  : JSON.stringify(tc.arguments),
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

    // Sanitize history to ensure no broken tool call sequences
    const systemMsg = openaiMessages[0]; // preserve system message
    const historyMsgs = sanitizeHistory(openaiMessages.slice(1));
    openaiMessages.length = 0;
    openaiMessages.push(systemMsg, ...historyMsgs);

    // Add current user message (with images if present)
    if (validatedImageUrls.length) {
      // Convert to base64 to guarantee OpenAI receives the image data
      const base64Urls = await Promise.all(
        validatedImageUrls.map(imageUrlToDataUri)
      );
      openaiMessages.push({
        role: "user",
        content: [
          { type: "text", text: message },
          ...base64Urls.map((url: string) => ({
            type: "image_url",
            image_url: { url, detail: "high" },
          })),
        ],
      });
    } else {
      openaiMessages.push({ role: "user", content: message });
    }

    // Call OpenAI API
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Use gpt-4o-mini for the first call (tool routing) when patient context is present
    // to stay within TPM rate limits. gpt-4o is used for the final clinical response.
    const firstCallModel = patient_id ? "gpt-4o-mini" : "gpt-4o";

    log.debug(`Pre-OpenAI: ${Date.now() - t0}ms, messages: ${openaiMessages.length}, model: ${firstCallModel}`);

    const openaiResponse = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: firstCallModel,
          messages: openaiMessages,
          tools: getOpenAITools(),
          temperature: 0.3,
          max_tokens: validatedImageUrls.length > 0 ? 4000 : 2500,
        }),
      },
      validatedImageUrls.length > 0 ? 60000 : 45000
    );

    log.debug(`First OpenAI call: ${Date.now() - t0}ms`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logError("dentist-agent", `OpenAI API error (${openaiResponse.status})`, errorText);
      console.error(`[dentist-agent] OpenAI status=${openaiResponse.status}, body=${errorText.substring(0, 500)}`);
      if (openaiResponse.status === 429) {
        // Parse to check if it's quota vs rate limit
        let detail = "";
        try {
          const errJson = JSON.parse(errorText);
          detail = errJson?.error?.type || errJson?.error?.code || "";
        } catch {}
        throw new Error(
          detail === "insufficient_quota"
            ? "Créditos da API OpenAI esgotados. Verifique o saldo em platform.openai.com."
            : "O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos."
        );
      }
      if (openaiResponse.status === 401) {
        throw new Error(
          "Erro de configuração do serviço de IA. Contacte o suporte."
        );
      }
      throw new Error(`Erro no serviço de IA (${openaiResponse.status}). Tente novamente.`);
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

    // If mini was used for tool routing but no tools were called,
    // re-call with gpt-4o for quality clinical response (no tools = fewer tokens)
    if (firstCallModel === "gpt-4o-mini" && toolCalls.length === 0) {
      log.debug(`Mini returned no tools, re-calling with gpt-4o: ${Date.now() - t0}ms`);
      try {
        const qualityResponse = await fetchWithTimeout(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: openaiMessages,
              temperature: 0.3,
              max_tokens: validatedImageUrls.length > 0 ? 4000 : 2500,
            }),
          },
          validatedImageUrls.length > 0 ? 60000 : 45000
        );

        if (qualityResponse.ok) {
          const qualityData = await qualityResponse.json();
          const qualityChoice = qualityData.choices?.[0];
          if (qualityChoice?.message?.content) {
            responseText = qualityChoice.message.content;
          }
        } else {
          // Fallback: use mini response if gpt-4o is rate-limited
          log.debug(`Quality re-call failed (${qualityResponse.status}), using mini response`);
        }
      } catch (err) {
        log.debug(`Quality re-call error, using mini response: ${err}`);
      }
      log.debug(`Quality re-call done: ${Date.now() - t0}ms`);
    }

    // If there are tool calls, execute them
    if (toolCalls.length > 0) {
      // Save assistant message with tool calls
      await supabase.from("dentist_agent_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: responseText || "Consultando dados do paciente...",
        tool_calls: toolCalls,
      });

      // Execute each tool call and collect results
      const toolMessages: any[] = [];
      let visionImageUrls: string[] = [];
      let visionExamInfo: any = null;

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

          // Collect vision image URLs and exam context
          if (result.requires_vision && result.image_urls) {
            visionImageUrls = [...visionImageUrls, ...result.image_urls];
            if (result.exam_info) visionExamInfo = result.exam_info;
          }

          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultStr,
          });

          // Save tool result
          await supabase.from("dentist_agent_messages").insert({
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

      // Build second call messages
      const secondMessages = [
        ...openaiMessages,
        {
          role: "assistant",
          content: responseText || null,
          tool_calls: choice.message.tool_calls,
        },
        ...toolMessages,
      ];

      // If vision required, convert images to base64 and add to follow-up message
      if (visionImageUrls.length > 0) {
        const base64VisionUrls = await Promise.all(
          visionImageUrls.map(imageUrlToDataUri)
        );

        // Build contextual prompt with exam metadata
        const examContext = visionExamInfo
          ? `Exame: ${visionExamInfo.type || "Não especificado"}${visionExamInfo.date ? ` (${visionExamInfo.date})` : ""}${visionExamInfo.description ? `. Descrição: ${visionExamInfo.description}` : ""}.`
          : "";

        secondMessages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: `${examContext}\nAnalise esta imagem odontológica seguindo o protocolo IMAGEM do system prompt. Identifique estruturas anatômicas, achados normais e anormais, possíveis patologias e qualidade técnica. Use notação FDI para dentes. Seja específico e objetivo nos achados.`,
            },
            ...base64VisionUrls.map((url: string) => ({
              type: "image_url",
              image_url: { url, detail: "high" },
            })),
          ],
        });
      }

      log.debug(`Pre-second OpenAI: ${Date.now() - t0}ms`);

      const secondResponse = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: secondMessages,
            temperature: 0.3,
            max_tokens: visionImageUrls.length > 0 ? 4000 : 2500,
          }),
        },
        60000 // longer timeout when processing images
      );

      log.debug(`Second OpenAI call: ${Date.now() - t0}ms`);

      if (!secondResponse.ok) {
        const errText = await secondResponse.text();
        logError("dentist-agent", `Second OpenAI call error (${secondResponse.status})`, errText);
        console.error(`[dentist-agent] 2nd OpenAI status=${secondResponse.status}, body=${errText.substring(0, 500)}`);
        if (secondResponse.status === 429) {
          let detail = "";
          try {
            const errJson = JSON.parse(errText);
            detail = errJson?.error?.type || errJson?.error?.code || "";
          } catch {}
          throw new Error(
            detail === "insufficient_quota"
              ? "Créditos da API OpenAI esgotados. Verifique o saldo em platform.openai.com."
              : "O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos."
          );
        }
        throw new Error("Erro no serviço de IA. Tente novamente.");
      }

      const secondData = await secondResponse.json();
      const secondChoice = secondData.choices?.[0];
      responseText = secondChoice?.message?.content || "Sem resposta.";
    }

    // Save final assistant response
    await supabase.from("dentist_agent_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: responseText,
    });

    log.info(`Request completed in ${Date.now() - t0}ms`);

    // Audit: AI request
    log.audit(supabase, {
      action: "AI_REQUEST", table_name: "DentistAgent", record_id: conversationId,
      user_id: user.id, clinic_id,
      details: {
        model: "gpt-4o",
        tools_used: toolCalls.map((tc: any) => tc.name),
        has_patient_context: !!patient_id,
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
    return createErrorResponse(error, corsHeaders, "dentist-agent");
  }
});
