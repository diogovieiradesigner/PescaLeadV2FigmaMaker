/**
 * Rate Limiter simples em memória para Edge Functions
 * Limita requisições por IP usando sliding window
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Cache em memória (resetado quando a função é reiniciada)
const rateLimitCache = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (entry.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
}, 60000); // Limpa a cada 1 minuto

export interface RateLimitConfig {
  /** Número máximo de requisições permitidas */
  maxRequests: number;
  /** Janela de tempo em segundos */
  windowSeconds: number;
  /** Prefixo para identificar a função (ex: "public-booking") */
  prefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Extrai o IP do cliente do request
 */
export function getClientIP(req: Request): string {
  // Headers comuns para proxy reverso
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback para CF
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }

  return "unknown";
}

/**
 * Verifica se a requisição está dentro do limite
 */
export function checkRateLimit(
  req: Request,
  config: RateLimitConfig
): RateLimitResult {
  const ip = getClientIP(req);
  const key = `${config.prefix}:${ip}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitCache.get(key);

  // Se não existe ou expirou, criar nova entrada
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitCache.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Incrementar contador
  entry.count++;

  // Verificar se excedeu o limite
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Headers de resposta para rate limiting (RFC 6585)
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Resposta padrão para rate limit excedido
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        "Content-Type": "application/json",
      },
    }
  );
}
