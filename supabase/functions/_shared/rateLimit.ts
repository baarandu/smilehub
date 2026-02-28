/**
 * Rate limiting para Edge Functions
 * Primary: tabela api_rate_limits no Supabase
 * Fallback: in-memory tracking per isolate when DB fails
 */

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  constructor(
    message = "Muitas requisições. Tente novamente em alguns minutos."
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMinutes: number;
}

// In-memory fallback rate limit tracking (per Deno isolate)
const memoryStore = new Map<string, { count: number; windowStart: number }>();

function checkMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): void {
  const key = `${identifier}:${config.endpoint}`;
  const now = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;
  const entry = memoryStore.get(key);

  if (entry && now - entry.windowStart < windowMs) {
    entry.count++;
    if (entry.count > config.maxRequests) {
      throw new RateLimitError();
    }
  } else {
    memoryStore.set(key, { count: 1, windowStart: now });
  }

  // Cleanup old entries (limit memory usage)
  if (memoryStore.size > 1000) {
    for (const [k, v] of memoryStore) {
      if (now - v.windowStart >= windowMs) memoryStore.delete(k);
    }
  }
}

export async function checkRateLimit(
  supabase: any,
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    const windowStart = new Date(
      Date.now() - config.windowMinutes * 60 * 1000
    ).toISOString();

    // Insert first, then count — eliminates TOCTOU race condition.
    // Even under concurrent requests, each inserts before counting,
    // so the count always reflects the true number of requests.
    const { error: insertError } = await supabase
      .from("api_rate_limits")
      .insert({ identifier, endpoint: config.endpoint });

    if (insertError) {
      console.warn(`[rateLimit] Insert error, using in-memory fallback: ${insertError.message}`);
      checkMemoryRateLimit(identifier, config);
      return;
    }

    // Count all requests in window (including the one just inserted)
    const { count, error } = await supabase
      .from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("endpoint", config.endpoint)
      .gte("created_at", windowStart);

    if (error) {
      console.warn(`[rateLimit] DB count error: ${error.message}`);
      return; // Already inserted, skip check gracefully
    }

    if ((count || 0) > config.maxRequests) {
      console.warn(
        `[rateLimit] Exceeded: ${identifier} on ${config.endpoint} (${count}/${config.maxRequests} in ${config.windowMinutes}min)`
      );

      // Fire-and-forget audit log for rate limit exceeded
      supabase
        .from("audit_logs")
        .insert({
          action: "RATE_LIMIT_EXCEEDED",
          table_name: "RateLimit",
          user_id: identifier,
          details: { endpoint: config.endpoint, count, max: config.maxRequests, window_minutes: config.windowMinutes },
          source: "edge_function",
          function_name: config.endpoint,
        })
        .then(() => {})
        .catch(() => {});

      throw new RateLimitError();
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    console.warn(`[rateLimit] Unexpected error, using in-memory fallback: ${error}`);
    checkMemoryRateLimit(identifier, config);
  }
}
