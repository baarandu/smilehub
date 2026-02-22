import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  extractBearerToken,
  validateRequired,
  validateMaxLength,
} from "../_shared/validation.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { requireSafeInput } from "../_shared/aiSanitizer.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";

const TEXT_PROMPT = `Você é um assistente para clínicas odontológicas brasileiras. Sua tarefa é extrair itens de materiais/produtos de um texto livre (lista de fornecedor, mensagem de WhatsApp, anotação, etc.).

REGRAS:
1. Extraia APENAS itens que estão EXPLICITAMENTE mencionados no texto.
2. NUNCA invente itens ou valores que não estejam no texto.
3. Converta valores monetários brasileiros para número decimal: "R$ 12,50" → 12.50, "R$1.500,00" → 1500.00
4. Se a quantidade não estiver especificada, use 1.
5. Se o valor unitário não estiver especificado, use 0.
6. Se a marca do produto estiver mencionada (em qualquer lugar do texto), preencha para todos os itens.
7. Identifique a marca/fabricante se mencionada (ex: "TDV", "3M", "Dentsply", etc.).

FORMATO DE SAÍDA (JSON):
{
  "items": [
    {
      "name": "Nome do produto",
      "quantity": 1,
      "unitPrice": 12.50,
      "brand": "Marca/fabricante ou vazio"
    }
  ],
  "supplier": "Fornecedor principal (se identificado)" ou null
}`;

const INVOICE_PROMPT = `Você é um assistente para clínicas odontológicas brasileiras. Sua tarefa é extrair dados de uma Nota Fiscal (NF-e/NFC-e) brasileira.

REGRAS:
1. Extraia TODOS os itens da nota fiscal com nome, quantidade, valor unitário.
2. Converta valores para número decimal: "12,50" → 12.50
3. Extraia o nome do fornecedor/emitente da NF.
4. Identifique a marca/fabricante de cada produto se visível.
5. Extraia a forma de pagamento se visível (Dinheiro, Cartão Crédito, Cartão Débito, Pix, Boleto, etc.).
6. Extraia o valor total da NF.
7. NUNCA invente dados — extraia apenas o que está visível no documento.

FORMATO DE SAÍDA (JSON):
{
  "items": [
    {
      "name": "Nome do produto",
      "quantity": 1,
      "unitPrice": 12.50,
      "brand": "Marca/fabricante do produto"
    }
  ],
  "supplier": "Nome do emitente/fornecedor",
  "payment_method": "Forma de pagamento" ou null,
  "total_amount": 150.00 ou null
}`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const log = createLogger("parse-materials");

  try {
    // Auth
    const token = extractBearerToken(req.headers.get("Authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.audit(supabase, {
        action: "AUTH_FAILURE",
        table_name: "System",
        details: { reason: "Invalid token" },
      });
      throw new Error("Unauthorized");
    }

    // Rate limit: 30 requests per hour
    await checkRateLimit(supabase, user.id, {
      endpoint: "parse-materials",
      maxRequests: 30,
      windowMinutes: 60,
    });

    const body = await req.json();
    const { mode, text, image_base64, file_type, clinic_id } = body;

    // Validate mode
    validateRequired(mode, "mode");
    if (mode !== "text" && mode !== "invoice") {
      throw new Error("mode must be 'text' or 'invoice'");
    }

    // Verify user belongs to clinic
    if (clinic_id) {
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("role")
        .eq("clinic_id", clinic_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clinicUser)
        throw new Error("User not authorized for this clinic");
    }

    let gptResponse;

    if (mode === "text") {
      // Text mode: GPT-4o-mini
      validateRequired(text, "text");
      validateMaxLength(text, 50000, "text");

      // Check for prompt injection (blocking mode)
      requireSafeInput(text, {
        functionName: "parse-materials",
        userId: user.id,
        clinicId: clinic_id,
      });

      gptResponse = await fetch(
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
              { role: "system", content: TEXT_PROMPT },
              { role: "user", content: text },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 4000,
          }),
        }
      );
    } else {
      // Invoice mode: GPT-4o vision
      validateRequired(image_base64, "image_base64");

      const mediaType =
        file_type === "pdf" ? "application/pdf" :
        file_type === "png" ? "image/png" :
        "image/jpeg";

      gptResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: INVOICE_PROMPT },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extraia os dados desta nota fiscal.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mediaType};base64,${image_base64}`,
                      detail: "high",
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 4000,
          }),
        }
      );
    }

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      log.error(`GPT API error: ${errorText}`);
      throw new Error("Erro no serviço de IA. Tente novamente.");
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;
    const tokensUsed = gptResult.usage?.total_tokens || 0;

    if (!content) throw new Error("No content in GPT response");

    const parsedData = JSON.parse(content);

    // Audit log
    log.audit(supabase, {
      action: "AI_REQUEST",
      table_name: "Materials",
      user_id: user.id,
      clinic_id,
      details: {
        mode,
        model: mode === "text" ? "gpt-4o-mini" : "gpt-4o",
        tokens_used: tokensUsed,
        items_extracted: parsedData.items?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({
        ...parsedData,
        tokens_used: tokensUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, "parse-materials");
  }
});
