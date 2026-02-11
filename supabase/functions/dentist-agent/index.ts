import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { TOOLS } from "./tools.ts";
import { executeToolCall } from "./toolExecutors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        console.warn(
          `[sanitize] Removing incomplete tool sequence at index ${i}: expected ${expectedCount} tool results, found ${foundCount}`
        );
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const t0 = Date.now();

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

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
      throw new Error(`Unauthorized: ${userError?.message || "No user"}`);
    }

    // Parse request body
    const { conversation_id, message, clinic_id, patient_id, image_urls } =
      await req.json();

    if (!message || !clinic_id) {
      throw new Error("Missing required fields: message, clinic_id");
    }

    // Verify user is dentist or admin of the clinic
    const { data: clinicUser, error: clinicUserError } = await supabase
      .from("clinic_users")
      .select("role, clinic_id, user_id")
      .eq("clinic_id", clinic_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      clinicUserError ||
      !clinicUser ||
      !["admin", "dentist"].includes(clinicUser.role)
    ) {
      throw new Error("Apenas dentistas e administradores podem usar o Dentista IA.");
    }

    // Pre-fetch patient context if patient_id provided
    let patientSummary: string | undefined;
    if (patient_id) {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("name, birth_date, allergies, medications, health_insurance")
        .eq("id", patient_id)
        .eq("clinic_id", clinic_id)
        .single();

      if (patientError) {
        console.error("Error fetching patient:", patientError);
      }

      if (patientData) {
        const age = patientData.birth_date
          ? calculateAge(patientData.birth_date)
          : null;
        patientSummary = [
          `Nome: ${patientData.name}`,
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

    console.log(`[timing] Auth + patient context: ${Date.now() - t0}ms`);

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

    // Get conversation history (last 50 messages — enough for several tool rounds)
    const { data: history, error: historyError } = await supabase
      .from("dentist_agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (historyError) throw historyError;

    // Save user message (with image_urls if present)
    const { error: saveUserMsgError } = await supabase
      .from("dentist_agent_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
        image_urls: image_urls?.length ? image_urls : null,
      });

    if (saveUserMsgError) throw saveUserMsgError;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(patientSummary, patient_id || undefined);

    // Prepare messages for OpenAI
    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add history, reconstructing multi-part content for messages with images
    for (const msg of history || []) {
      if (msg.role === "user") {
        if (msg.image_urls?.length) {
          openaiMessages.push({
            role: "user",
            content: [
              { type: "text", text: msg.content },
              ...msg.image_urls.map((url: string) => ({
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
    if (image_urls?.length) {
      openaiMessages.push({
        role: "user",
        content: [
          { type: "text", text: message },
          ...image_urls.map((url: string) => ({
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

    console.log(`[timing] Pre-OpenAI: ${Date.now() - t0}ms, messages: ${openaiMessages.length}`);

    const openaiResponse = await fetchWithTimeout(
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
          tools: getOpenAITools(),
          temperature: 0.3,
          max_tokens: 2500,
        }),
      },
      45000
    );

    console.log(`[timing] First OpenAI call: ${Date.now() - t0}ms`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      if (openaiResponse.status === 429) {
        throw new Error(
          "O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos."
        );
      }
      if (openaiResponse.status === 401) {
        throw new Error(
          "Erro de configuração do serviço de IA. Contacte o suporte."
        );
      }
      throw new Error(
        `Erro no serviço de IA. Tente novamente. (código: ${openaiResponse.status})`
      );
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
      await supabase.from("dentist_agent_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: responseText || "Consultando dados do paciente...",
        tool_calls: toolCalls,
      });

      // Execute each tool call and collect results
      const toolMessages: any[] = [];
      let visionImageUrls: string[] = [];

      for (const toolCall of toolCalls) {
        try {
          console.log(
            `[timing] Executing tool ${toolCall.name}: ${Date.now() - t0}ms`
          );
          const result = await executeToolCall(
            toolCall.name,
            toolCall.arguments,
            clinic_id,
            supabase
          );

          const resultStr = JSON.stringify(result);
          console.log(
            `[timing] Tool ${toolCall.name} done: ${Date.now() - t0}ms (${resultStr.length} chars)`
          );

          // Collect vision image URLs
          if (result.requires_vision && result.image_urls) {
            visionImageUrls = [...visionImageUrls, ...result.image_urls];
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

      // If vision required, add images to a follow-up user message
      if (visionImageUrls.length > 0) {
        secondMessages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Aqui está a imagem do exame para análise. Descreva os achados radiográficos/clínicos objetivamente.",
            },
            ...visionImageUrls.map((url: string) => ({
              type: "image_url",
              image_url: { url, detail: "high" },
            })),
          ],
        });
      }

      console.log(`[timing] Pre-second OpenAI: ${Date.now() - t0}ms`);

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
            max_tokens: 2500,
          }),
        },
        45000
      );

      console.log(`[timing] Second OpenAI call: ${Date.now() - t0}ms`);

      if (!secondResponse.ok) {
        const errText = await secondResponse.text();
        console.error("Second OpenAI call error:", errText);
        if (secondResponse.status === 429) {
          throw new Error(
            "O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos."
          );
        }
        throw new Error(
          `Erro no serviço de IA. Tente novamente. (código: ${secondResponse.status})`
        );
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

    console.log(`[timing] Total: ${Date.now() - t0}ms`);

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
    console.error("Error in dentist-agent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
