import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { checkRateLimit, RateLimitError } from "../_shared/rateLimit.ts";

/**
 * Login attempt recorder — pentest finding #18.
 *
 * The DB function record_login_attempt is no longer callable by anon/authenticated
 * (see migration 20260612_lock_record_login_attempt.sql). It is reached only here,
 * via the service role, so the lockout history can no longer be poisoned by direct
 * anonymous PostgREST calls.
 *
 * The genuine hardening over the raw RPC is the per-IP throttle below: a single
 * source can no longer fire unlimited record(false) calls to lock arbitrary
 * victim emails. The per-email lockout (5 fails / 15 min) still lives in the RPC.
 *
 * This endpoint is intentionally pre-auth (verify_jwt = false): it runs before the
 * user is authenticated. It fails open — any error returns a benign not-locked
 * state, matching the frontend contract in src/lib/rateLimit.ts.
 */

// Generous enough for a shared clinic IP (several staff mistyping passwords),
// tight enough that one source cannot mass-lock accounts: 30 records / 15 min
// caps an attacker at ~6 victims per IP per window (5 fails each).
const IP_RATE_LIMIT = { endpoint: "login-attempt", maxRequests: 30, windowMinutes: 15 };

function notLocked(corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(
    JSON.stringify({ locked: false, minutes_remaining: 0 }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  if (req.method !== "POST") {
    return notLocked(corsHeaders, 405);
  }

  try {
    const { email, success } = await req.json().catch(() => ({}));

    // No email → nothing to record. Fail open.
    if (!email || typeof email !== "string") {
      return notLocked(corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Per-IP throttle. The real client IP is in x-forwarded-for. If a single
    // source exceeds the budget we skip recording entirely (do not poison the
    // lockout table) and fail open.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    try {
      await checkRateLimit(supabase, ip, IP_RATE_LIMIT);
    } catch (err) {
      if (err instanceof RateLimitError) {
        // Throttled source: do not record, fail open so a legitimate user
        // behind the same IP is never blocked from logging in.
        return notLocked(corsHeaders, 429);
      }
      throw err;
    }

    const { data, error } = await supabase.rpc("record_login_attempt", {
      p_email: email,
      p_success: !!success,
    });

    if (error || !data) {
      return notLocked(corsHeaders);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        locked: !!row?.locked,
        minutes_remaining: row?.minutes_remaining ?? 0,
        remaining_attempts: row?.remaining_attempts ?? undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_err) {
    // Fail open on any unexpected error.
    return notLocked(corsHeaders);
  }
});
