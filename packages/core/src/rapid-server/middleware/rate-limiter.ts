import rateLimit from "express-rate-limit";
import type { ServerFunction } from "@/types";

/**
 * Rate limiting configuration for routes
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Maximum requests per window */
  max?: number;
  /** Custom error message */
  message?: string | { error: string; message: string };
  /** Skip rate limiting for this route */
  skip?: boolean;
}

// Express-compatible request/response adapters for Bun
interface ExpressRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  url: string;
  method: string;
  path: string;
}

interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(data: any): ExpressResponse;
  set(field: string, value: string): ExpressResponse;
  setHeader(name: string, value: string | string[]): ExpressResponse;
  send(data: any): ExpressResponse;
  end(): void;
  statusCode?: number;
  headersSent?: boolean;
  _headers?: Record<string, string>;
}

// Convert Bun Request to Express-like request
function createExpressRequest(req: Request, url: URL): ExpressRequest {
  // Extract IP from headers (same logic as before)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  const ip =
    forwarded?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown";

  // Convert headers to Express format
  const headers: Record<string, string | string[] | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    ip,
    headers,
    url: url.pathname + url.search,
    method: req.method,
    path: url.pathname,
  };
}

// Convert Express response to Bun Response
function createBunResponse(expressRes: ExpressResponse, data?: any): Response {
  const status = expressRes.statusCode || 429;
  const headers = new Headers();

  // Add rate limit headers
  if (expressRes._headers) {
    Object.entries(expressRes._headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Add security headers
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Content-Type", "application/json");

  const body = data || {
    error: "Too Many Requests",
    message: "Rate limit exceeded. Please try again later.",
  };

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

// Create a wrapper to adapt express-rate-limit for Bun
function createRateLimitAdapter(limiter: any): ServerFunction {
  return async (req: Request, url: URL) => {
    return new Promise<Response | null>((resolve) => {
      const expressReq = createExpressRequest(req, url);

      // Mock Express response
      let responseData: any;
      let statusCode = 200;
      const responseHeaders: Record<string, string> = {};
      let isResponseSent = false;

      const expressRes: ExpressResponse = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          responseData = data;
          return this;
        },
        set(field: string, value: string) {
          responseHeaders[field] = value;
          return this;
        },
        setHeader(name: string, value: string | string[]) {
          responseHeaders[name] = Array.isArray(value)
            ? value.join(", ")
            : value;
          return this;
        },
        send(data: any) {
          responseData = data;
          return this;
        },
        end() {
          isResponseSent = true;
          // Response ended, create Bun response
          if (statusCode === 429) {
            const bunResponse = createBunResponse(
              {
                statusCode,
                _headers: responseHeaders,
              } as ExpressResponse,
              responseData
            );
            resolve(bunResponse);
          } else {
            resolve(null); // Allow request to continue
          }
        },
        statusCode,
        headersSent: false,
        _headers: responseHeaders,
      };

      // Call express-rate-limit
      limiter(expressReq, expressRes, (err?: any) => {
        if (err) {
          console.error("Rate limiter error:", err);
          resolve(null); // Allow request on error
        } else if (!isResponseSent) {
          // If no error and no response sent, allow request
          resolve(null);
        }
      });
    });
  };
}

// Pre-configured rate limiters using express-rate-limit
export const rateLimiters = {
  // Global rate limiter - prevent extreme abuse
  global: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 total requests per minute per IP (generous global limit)
    message: {
      error: "Too Many Requests",
      message: "Global rate limit exceeded. Please try again later.",
    },
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      return `global:${req.ip}`;
    },
    handler: (req: any, res: any, next: any) => {
      console.warn(`🚨 Global rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: "Too Many Requests",
        message: "Global rate limit exceeded. Please try again later.",
      });
    },
  }),
};

// Middleware factory function
export const createRateLimitMiddleware = (limiter: any): ServerFunction => {
  return createRateLimitAdapter(limiter);
};

/**
 * Create a custom rate limiter from configuration
 */
export const createCustomRateLimit = (
  config: RateLimitConfig,
  routePath: string
): ServerFunction => {
  const limiter = rateLimit({
    windowMs: config.windowMs || 60 * 1000, // Default 1 minute
    max: config.max || 100, // Default 100 requests
    message: config.message || {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
    },
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      return `custom:${routePath}:${req.ip}`;
    },
    skip: config.skip ? () => true : undefined,
  });

  return createRateLimitAdapter(limiter);
};

// Request size limiting middleware (keeping this as it's not part of express-rate-limit)
export const createRequestSizeLimitMiddleware = (
  maxSizeBytes: number = 1024 * 1024
): ServerFunction => {
  return async (req: Request, url: URL) => {
    const contentLength = req.headers.get("content-length");

    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return new Response(
        JSON.stringify({
          error: "Payload Too Large",
          message: `Request size exceeds limit of ${Math.round(
            maxSizeBytes / 1024 / 1024
          )}MB`,
        }),
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        }
      );
    }

    return null; // Allow request to continue
  };
};

// Basic suspicious activity detection (simplified version)
export const createSuspiciousActivityMiddleware = (): ServerFunction => {
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
  ];

  const suspiciousUserAgents = [/bot/i, /crawler/i, /spider/i, /scraper/i];

  return async (req: Request, url: URL) => {
    const userAgent = req.headers.get("user-agent") || "";
    const fullUrl = url.pathname + url.search;

    // Check for suspicious patterns in URL
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullUrl)) {
        console.warn(`🚨 Suspicious activity detected: ${fullUrl}`);
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Suspicious activity detected",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "X-Frame-Options": "DENY",
              "X-Content-Type-Options": "nosniff",
              "Referrer-Policy": "strict-origin-when-cross-origin",
            },
          }
        );
      }
    }

    // Check for suspicious user agents (optional - might be too aggressive)
    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        console.warn(`🚨 Suspicious user agent: ${userAgent}`);
        // Just log for now, don't block
        break;
      }
    }

    return null; // Allow request to continue
  };
};
