/**
 * Configuração de CORS para Edge Functions
 * Restringe requisições apenas aos domínios autorizados
 */

const ALLOWED_ORIGINS = [
  'https://organizaodonto.vercel.app',
  'http://localhost:5173', // Desenvolvimento local
  'http://localhost:3000', // Desenvolvimento local alternativo
];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';

  // Verifica se a origem está na lista de permitidos
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

// Headers para resposta OPTIONS (preflight)
export function handleCorsOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
