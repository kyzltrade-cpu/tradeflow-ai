// Simple in-memory rate limiter
//
// STOPGAP, with a known weakness: this Map lives in one Node process, so on
// serverless (Vercel) every cold start / new instance begins with an empty map
// and every warm instance counts independently. The effective limit is
// therefore "per instance", not "per customer" — a determined caller spreads
// requests across instances to multiply their budget. This is still a large
// improvement over no limit (it stops the casual single-instance flood) and it
// needs no infrastructure, so it is intentionally kept as-is here.
//
// When the endpoints get real traffic, swap the storage behind
// checkRateLimit for a shared counter — Upstash/Redis via @upstash/ratelimit,
// or the Vercel KV equivalent — keeping this module's exported interface
// identical so call sites do not change.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  const record = rateLimitMap.get(key);

  // Compare against `now`, not `now - windowMs`: resetTime is already an
  // absolute timestamp one window into the future, so testing it against a
  // window *start* left the record live for twice its intended window (a
  // 20/minute limit silently behaved as 20 per 2 minutes).
  if (!record || record.resetTime <= now) {
    // New window or expired record
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export function createRateLimitResponse(resetTime: number): Response {
  // Clamped at zero: an already-elapsed window would otherwise emit a negative
  // Retry-After, which is not a valid header value.
  const retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
      },
    }
  );
}
