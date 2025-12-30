/**
 * CORS Configuration for Edge Functions
 * Provides secure CORS headers with domain whitelist
 */

// Domínios permitidos para funções autenticadas
const ALLOWED_ORIGINS = [
  "https://hub.pescalead.com.br",
  "https://www.pescalead.com.br",
  "https://pescalead.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

/**
 * Verifica se a origem é permitida
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.startsWith(allowed)
  );
}

/**
 * Retorna headers CORS para funções AUTENTICADAS (whitelist)
 */
export function getAuthenticatedCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowedOrigin = isOriginAllowed(origin) ? origin! : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Retorna headers CORS para funções PÚBLICAS (permite qualquer origem)
 * Use apenas para: widget-chat, public-booking, ai-public-chat, webhooks
 */
export function getPublicCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

/**
 * Headers CORS padrão para admin functions (mais restritivo)
 */
export function getAdminCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");

  // Admin functions só permitem produção e localhost
  const adminAllowedOrigins = [
    "https://hub.pescalead.com.br",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  const isAllowed = origin && adminAllowedOrigins.some(allowed => origin === allowed);
  const allowedOrigin = isAllowed ? origin! : adminAllowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}
