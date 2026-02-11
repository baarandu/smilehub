/**
 * Rate limiting para Edge Functions
 * Usa tabela api_rate_limits no Supabase para tracking
 * Fail-open: se o rate limiter der erro, permite a request
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

export async function checkRateLimit(
  supabase: any,
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    const windowStart = new Date(
      Date.now() - config.windowMinutes * 60 * 1000
    ).toISOString();

    // Count recent requests within window
    const { count, error } = await supabase
      .from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("endpoint", config.endpoint)
      .gte("created_at", windowStart);

    if (error) {
      console.warn(`[rateLimit] Error checking: ${error.message}`);
      return; // Fail open
    }

    if ((count || 0) >= config.maxRequests) {
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

    // Record this request (fire-and-forget, don't block on insert)
    supabase
      .from("api_rate_limits")
      .insert({ identifier, endpoint: config.endpoint })
      .then(() => {})
      .catch((err: any) =>
        console.warn(`[rateLimit] Insert error: ${err.message}`)
      );
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    console.warn(`[rateLimit] Unexpected error: ${error}`);
    // Fail open
  }
}
