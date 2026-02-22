/**
 * Configuração de CORS para Edge Functions
 * Restringe requisições apenas aos domínios autorizados
 */

const PRODUCTION_ORIGINS = [
  'https://organizaodonto.vercel.app',
];

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:8082',
];

// In production (Deno Deploy), exclude localhost origins
const isProduction = !!Deno.env.get('DENO_DEPLOYMENT_ID');
const ALLOWED_ORIGINS = isProduction
  ? PRODUCTION_ORIGINS
  : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';

  // Only set Access-Control-Allow-Origin if origin is in the allowlist
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// Headers para resposta OPTIONS (preflight)
export function handleCorsOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
