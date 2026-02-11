/**
 * Tratamento seguro de erros para Edge Functions
 * - Nunca vaza detalhes internos ao cliente
 * - Sanitiza logs (remove chaves de API, tokens)
 * - Retorna mensagens genéricas com ID de referência
 */

import { ValidationError } from "./validation.ts";
import { RateLimitError } from "./rateLimit.ts";
import { ConsentError } from "./consent.ts";

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9_]{20,}/g, // OpenAI keys
  /sk_live_[a-zA-Z0-9_]{20,}/g, // Stripe live keys
  /sk_test_[a-zA-Z0-9_]{20,}/g, // Stripe test keys
  /whsec_[a-zA-Z0-9_]{20,}/g, // Stripe webhook secrets
  /Bearer\s+[^\s]{20,}/g, // Bearer tokens
  /eyJ[a-zA-Z0-9_-]{50,}/g, // JWTs
  /supabase_service_role_key[=:]\s*[^\s]+/gi,
];

function sanitizeLogMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

export function logError(
  functionName: string,
  context: string,
  error: unknown
): string {
  const errorId = crypto.randomUUID().slice(0, 8);
  const message = error instanceof Error ? error.message : String(error);
  const sanitized = sanitizeLogMessage(message);

  console.error(
    `[${functionName}][${errorId}] ${context}: ${sanitized}`
  );

  return errorId;
}

export function createErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  functionName: string
): Response {
  // Rate limit errors → 429
  if (error instanceof RateLimitError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Consent errors → 403
  if (error instanceof ConsentError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Validation errors are safe to return as-is (user input errors)
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Known user-facing error messages (already safe)
  const message = error instanceof Error ? error.message : "";
  const safeMessages = [
    "Unauthorized",
    "User not authorized for this clinic",
    "Missing required fields",
    "O serviço de IA está temporariamente indisponível",
    "Erro de configuração do serviço de IA",
    "Apenas dentistas e administradores",
    "Only admins can use",
    // Subscription
    "Nenhuma assinatura ativa encontrada",
    "Plano nao encontrado",
    "Falha ao atualizar plano",
    "Erro ao cancelar no Stripe",
    "Falha ao gerar o segredo de pagamento",
    // Email
    "Erro ao enviar email de convite",
  ];

  const isSafeMessage = safeMessages.some((safe) => message.includes(safe));
  if (isSafeMessage) {
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: message.includes("Unauthorized") ? 401 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Everything else gets a generic message with reference ID
  const errorId = logError(functionName, "Unhandled error", error);

  return new Response(
    JSON.stringify({
      error: `Erro interno. Referência: ${errorId}`,
    }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
