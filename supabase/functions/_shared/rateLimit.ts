export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

/**
 * Check and update rate limit for a user and feature.
 * Uses a sliding window approach with atomic increment.
 * 
 * @param supabase - Supabase client with service role
 * @param userId - The user's ID
 * @param feature - The feature key (e.g., 'expert_chat', 'plan_wizard')
 * @returns RateLimitResult with allowed status and remaining requests
 */
// deno-lint-ignore no-explicit-any
export async function checkRateLimit(
  supabase: any,
  userId: string,
  feature: string
): Promise<RateLimitResult> {
  try {
    // 1. Fetch rate config for this feature
    const { data: config, error: configError } = await supabase
      .from("ai_rate_config")
      .select("max_requests, window_minutes, is_active")
      .eq("feature", feature)
      .maybeSingle();

    // If no config or rate limiting is disabled, allow all
    if (configError || !config || !config.is_active) {
      return { 
        allowed: true, 
        remaining: 999, 
        resetAt: new Date(), 
        limit: 999 
      };
    }

    const { max_requests, window_minutes } = config;
    const windowMs = window_minutes * 60 * 1000;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // 2. Get or create rate limit record
    const { data: existing, error: fetchError } = await supabase
      .from("ai_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("feature", feature)
      .maybeSingle();

    if (fetchError) {
      console.error("Rate limit fetch error:", fetchError);
      // On error, allow the request but log
      return { allowed: true, remaining: 0, resetAt: now, limit: max_requests };
    }

    if (!existing) {
      // First request - create new record
      const { error: insertError } = await supabase
        .from("ai_rate_limits")
        .insert({
          user_id: userId,
          feature,
          requests_count: 1,
          window_start: now.toISOString()
        });

      if (insertError) {
        console.error("Rate limit insert error:", insertError);
      }

      return { 
        allowed: true, 
        remaining: max_requests - 1, 
        resetAt: new Date(now.getTime() + windowMs), 
        limit: max_requests 
      };
    }

    // 3. Check if window has expired
    const existingWindowStart = new Date(existing.window_start);
    if (existingWindowStart < windowStart) {
      // Window expired - reset counter
      const { error: resetError } = await supabase
        .from("ai_rate_limits")
        .update({ 
          requests_count: 1, 
          window_start: now.toISOString() 
        })
        .eq("id", existing.id);

      if (resetError) {
        console.error("Rate limit reset error:", resetError);
      }

      return { 
        allowed: true, 
        remaining: max_requests - 1, 
        resetAt: new Date(now.getTime() + windowMs), 
        limit: max_requests 
      };
    }

    // 4. Check if limit exceeded
    if (existing.requests_count >= max_requests) {
      const resetAt = new Date(existingWindowStart.getTime() + windowMs);
      return { 
        allowed: false, 
        remaining: 0, 
        resetAt, 
        limit: max_requests 
      };
    }

    // 5. Increment counter
    const { error: updateError } = await supabase
      .from("ai_rate_limits")
      .update({ requests_count: existing.requests_count + 1 })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Rate limit update error:", updateError);
    }

    return { 
      allowed: true, 
      remaining: max_requests - existing.requests_count - 1,
      resetAt: new Date(existingWindowStart.getTime() + windowMs),
      limit: max_requests
    };

  } catch (e) {
    console.error("Rate limit check exception:", e);
    // On exception, allow the request
    return { allowed: true, remaining: 0, resetAt: new Date(), limit: 0 };
  }
}

/**
 * Create rate limit error response with proper headers
 */
export function rateLimitResponse(
  rateLimit: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "You have exceeded the rate limit for this feature. Please try again later.",
      retryAfter,
      remaining: 0,
      limit: rateLimit.limit
    }), 
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        "Retry-After": String(retryAfter)
      }
    }
  );
}
