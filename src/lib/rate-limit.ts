import { NextResponse } from "next/server";

// Simple in-memory rate limiter
// Key: IP address, Value: { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number; // max requests per window
  windowMs: number; // time window in ms
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Strict: auth routes
  strict: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per min
  // Sensitive: payment, billing, bulk
  sensitive: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per min
  // Standard: general API
  standard: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per min
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "127.0.0.1";
}

export function rateLimit(
  request: Request,
  level: "strict" | "sensitive" | "standard" = "standard"
): NextResponse | null {
  const config = RATE_LIMIT_CONFIGS[level];
  const ip = getClientIp(request);
  const key = `${ip}:${level}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return null; // allowed
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(entry.resetTime),
        },
      }
    );
  }

  entry.count++;
  return null; // allowed
}
