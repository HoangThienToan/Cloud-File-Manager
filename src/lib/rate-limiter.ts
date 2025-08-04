import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or a distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req: NextRequest) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
    return ip;
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export function createRateLimiter(options: Partial<RateLimitOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function rateLimit(req: NextRequest): RateLimitResult {
    const key = config.keyGenerator(req);
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(k);
      }
    }

    // Get or create entry for this key
    let entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const success = entry.count <= config.maxRequests;

    return {
      success,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  };
}

// Pre-configured rate limiters for different endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
});

export const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
});

export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 API calls per 15 minutes
});

export const downloadRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 downloads per minute
});

// Middleware function to add rate limiting to API routes
export function withRateLimit(
  rateLimiter: (req: NextRequest) => RateLimitResult,
  handler: (req: NextRequest, context?: any) => Promise<Response>
) {
  return async function(req: NextRequest, context?: any): Promise<Response> {
    const result = rateLimiter(req);

    // Add rate limit headers to response
    const headers = new Headers({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
    });

    if (!result.success) {
      headers.set('Retry-After', result.retryAfter!.toString());
      
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers),
          },
        }
      );
    }

    // Call the original handler
    const response = await handler(req, context);
    
    // Add rate limit headers to successful responses
    for (const [key, value] of headers) {
      response.headers.set(key, value);
    }

    return response;
  };
}

// Helper to check rate limit without incrementing
export function checkRateLimit(req: NextRequest, rateLimiter: (req: NextRequest) => RateLimitResult): RateLimitResult {
  const key = DEFAULT_OPTIONS.keyGenerator(req);
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime) {
    return {
      success: true,
      limit: DEFAULT_OPTIONS.maxRequests,
      remaining: DEFAULT_OPTIONS.maxRequests,
      resetTime: now + DEFAULT_OPTIONS.windowMs,
    };
  }

  const remaining = Math.max(0, DEFAULT_OPTIONS.maxRequests - entry.count);
  const success = entry.count < DEFAULT_OPTIONS.maxRequests; // Don't increment

  return {
    success,
    limit: DEFAULT_OPTIONS.maxRequests,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000),
  };
}
