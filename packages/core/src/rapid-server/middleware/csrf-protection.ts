/**
 * CSRF Protection Middleware
 *
 * Protects against Cross-Site Request Forgery attacks by requiring
 * valid tokens for state-changing HTTP methods.
 */

import { randomBytes, timingSafeEqual } from "crypto";

export interface CSRFConfig {
  tokenName?: string;
  cookieName?: string;
  headerName?: string;
  excludePaths?: string[];
  tokenLength?: number;
  maxAge?: number; // Token expiry in milliseconds
}

interface CSRFToken {
  value: string;
  expires: number;
}

const DEFAULT_CONFIG: Required<CSRFConfig> = {
  tokenName: "_csrf",
  cookieName: "_csrf_token",
  headerName: "x-csrf-token",
  excludePaths: ["/api/health", "/ping"],
  tokenLength: 32,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * In-memory token store (use Redis/database in production)
 */
const tokenStore = new Map<string, CSRFToken>();

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken(config: Required<CSRFConfig>): string {
  return randomBytes(config.tokenLength).toString("hex");
}

/**
 * Create a session ID from request (in production, use proper session management)
 */
function getSessionId(req: Request): string {
  // Simple implementation - in production, use proper session management
  const userAgent = req.headers.get("user-agent") || "";
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return Buffer.from(`${ip}:${userAgent}`).toString("base64");
}

/**
 * Store CSRF token for session
 */
function storeToken(
  sessionId: string,
  token: string,
  config: Required<CSRFConfig>
): void {
  tokenStore.set(sessionId, {
    value: token,
    expires: Date.now() + config.maxAge,
  });
}

/**
 * Retrieve and validate CSRF token for session
 */
function validateToken(sessionId: string, providedToken: string): boolean {
  const storedToken = tokenStore.get(sessionId);

  if (!storedToken) {
    return false;
  }

  // Check if token is expired
  if (Date.now() > storedToken.expires) {
    tokenStore.delete(sessionId);
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(storedToken.value, "hex"),
      Buffer.from(providedToken, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Clean up expired tokens (call periodically)
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, token] of tokenStore.entries()) {
    if (now > token.expires) {
      tokenStore.delete(sessionId);
    }
  }
}

/**
 * Check if request method requires CSRF protection
 */
function requiresCSRFProtection(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/**
 * Check if path is excluded from CSRF protection
 */
function isExcludedPath(pathname: string, excludePaths: string[]): boolean {
  return excludePaths.some((path) => pathname.startsWith(path));
}

/**
 * Extract CSRF token from request
 */
function extractToken(
  req: Request,
  config: Required<CSRFConfig>
): string | null {
  // Try header first
  const headerToken = req.headers.get(config.headerName);
  if (headerToken) return headerToken;

  // Try cookie
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(new RegExp(`${config.cookieName}=([^;]+)`));
    if (match) return match[1];
  }

  return null;
}

/**
 * Create CSRF protection middleware
 */
export function createCSRFProtection(userConfig: CSRFConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  return async (req: Request, url: URL) => {
    const method = req.method;
    const pathname = url.pathname;

    // Skip CSRF protection for safe methods and excluded paths
    if (
      !requiresCSRFProtection(method) ||
      isExcludedPath(pathname, config.excludePaths)
    ) {
      return null;
    }

    const sessionId = getSessionId(req);
    const providedToken = extractToken(req, config);

    // Validate token for protected requests
    if (!providedToken || !validateToken(sessionId, providedToken)) {
      console.warn(`CSRF token validation failed for ${method} ${pathname}`);

      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Invalid or missing CSRF token",
          code: "CSRF_TOKEN_INVALID",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    return null; // Allow request to continue
  };
}

/**
 * Generate CSRF token endpoint handler
 */
export function createCSRFTokenEndpoint(userConfig: CSRFConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  return async (req: Request, url: URL) => {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const sessionId = getSessionId(req);
    const token = generateToken(config);

    storeToken(sessionId, token, config);

    return new Response(
      JSON.stringify({
        token,
        tokenName: config.tokenName,
        headerName: config.headerName,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `${
            config.cookieName
          }=${token}; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(
            config.maxAge / 1000
          )}`,
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  };
}

/**
 * Utility to get CSRF token for client-side use
 */
export async function getCSRFToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    console.warn("getCSRFToken() should only be called on the client");
    return null;
  }

  try {
    const response = await fetch("/api/_csrf");
    if (!response.ok) return null;

    const data = await response.json();
    return data.token;
  } catch {
    return null;
  }
}
