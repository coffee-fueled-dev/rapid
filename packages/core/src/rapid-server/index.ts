import type { Routes } from "@/routes";
import type { CSSCompiler } from "@rapid/css";
import { onListen } from "./util";

// Import functional modules
import {
  createAssetCache,
  precompileAssets,
  type AssetCache,
  type AssetManagerConfig,
} from "./modules/asset-manager";

import {
  createRouteCache,
  configureRoutes,
  precompileHTML,
  getAllPaths,
  type RouteCache,
} from "./modules/route-manager";

import {
  routeRequest,
  type MiddlewareConfig,
  type RequestContext,
} from "./modules/request-router";

import {
  getStaticAssetSecurityHeaders,
  securityPresets,
  type SecurityHeadersConfig,
} from "./middleware/security-headers";

function preventClientExecution(methodName: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${methodName} can only be called on the server`);
  }
}

/**
 * Apply security headers based on response type
 */
function applySecurityHeadersToResponse(
  response: Response,
  url: URL,
  securityConfig: SecurityHeadersConfig
): Response {
  const headers = new Headers(response.headers);
  const contentType = headers.get("content-type") || "";

  // Determine security headers based on content type
  let securityHeaders: Record<string, string> = {};

  if (contentType.includes("text/html")) {
    // Page response - full security headers
    securityHeaders = {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy":
        securityConfig.permissionsPolicy ||
        "camera=(), microphone=(), geolocation=()",
      "X-XSS-Protection": "1; mode=block",
    };

    // Add CSP for pages
    if (securityConfig.contentSecurityPolicy !== false) {
      if (typeof securityConfig.contentSecurityPolicy === "string") {
        securityHeaders["Content-Security-Policy"] =
          securityConfig.contentSecurityPolicy;
      } else {
        // Use preset based on environment
        const isDev = process.env.NODE_ENV !== "production";
        securityHeaders["Content-Security-Policy"] = isDev
          ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'"
          : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; upgrade-insecure-requests";
      }
    }
  } else if (contentType.includes("application/json")) {
    // API response - no CSP, but cache control
    securityHeaders = {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    };
  } else {
    // Static assets - minimal headers
    securityHeaders = getStaticAssetSecurityHeaders();
  }

  // Apply HSTS for HTTPS
  if (url.protocol === "https:" && securityConfig.hsts !== false) {
    securityHeaders["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";
  }

  // Add security headers (don't override existing headers)
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  // Additional framework security headers
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("X-Download-Options", "noopen");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export interface RapidServerConfig {
  cssCompiler?: CSSCompiler;
  enableRateLimit?: boolean;
  maxRequestSize?: number;
  isDev?: boolean;
  security?: SecurityHeadersConfig | "strict" | "development" | false;
}

export class RapidServer {
  // Minimal state - just the caches and configs
  private assetCache: AssetCache;
  private routeCache: RouteCache;
  private assetConfig: AssetManagerConfig;
  private middlewareConfig: MiddlewareConfig;
  private securityConfig: SecurityHeadersConfig;

  constructor(config: RapidServerConfig = {}) {
    // Initialize functional module state
    this.assetCache = createAssetCache();
    this.routeCache = createRouteCache();

    // Configuration objects
    this.assetConfig = {
      cssCompiler: config.cssCompiler || null,
      isDev: config.isDev ?? process.env.NODE_ENV !== "production",
    };

    this.middlewareConfig = {
      enableRateLimit: config.enableRateLimit ?? true,
      maxRequestSize: config.maxRequestSize ?? 1024 * 1024, // 1MB default
    };

    // Security configuration
    if (config.security === false) {
      this.securityConfig = {}; // No security headers
    } else if (typeof config.security === "string") {
      this.securityConfig = securityPresets[
        config.security
      ] as unknown as SecurityHeadersConfig;
    } else {
      // Use development preset by default in dev, strict in production
      const defaultPreset = this.assetConfig.isDev ? "development" : "strict";
      this.securityConfig =
        config.security ||
        (securityPresets[defaultPreset] as unknown as SecurityHeadersConfig);
    }
  }

  /**
   * Configure the server from the same Routes instance used on the client
   * This ensures client and server route definitions stay in sync
   */
  configureFromRoutes(routes: Routes): void {
    preventClientExecution("configureFromRoutes()");

    // Use functional route configuration
    this.routeCache = configureRoutes(routes);
  }

  /**
   * Pre-compile all assets for static serving (Docker builds)
   */
  async precompile(): Promise<void> {
    preventClientExecution("precompile()");

    console.log("🔧 Pre-compiling application assets...");

    // Pre-compile assets using functional modules
    this.assetCache = await precompileAssets(
      this.assetCache,
      this.assetConfig,
      getAllPaths(this.routeCache)
    );

    // Pre-compile HTML using functional modules
    this.routeCache = precompileHTML(this.routeCache);

    console.log("✅ Pre-compilation complete");
  }

  /**
   * Handle an HTTP request using functional routing
   */
  async handleRequest(req: Request): Promise<Response> {
    preventClientExecution("handleRequest()");

    const url = new URL(req.url);

    // Create request context
    const context: RequestContext = {
      req,
      url,
      routeCache: this.routeCache,
      assetCache: this.assetCache,
      assetConfig: this.assetConfig,
      middlewareConfig: this.middlewareConfig,
    };

    // Route the request using functional router
    const result = await routeRequest(context);

    // Update caches with any changes
    this.assetCache = result.updatedAssetCache;
    this.routeCache = result.updatedRouteCache;

    // Apply security headers automatically
    const secureResponse = applySecurityHeadersToResponse(
      result.response,
      url,
      this.securityConfig
    );

    return secureResponse;
  }

  /**
   * Create and start the HTTP server
   */
  async createServer(port: number = 3000): Promise<void> {
    preventClientExecution("createServer()");

    console.log("🔧 Starting development server...");

    if (this.middlewareConfig.enableRateLimit) {
      console.log("🛡️  Rate limiting enabled");
      console.log(
        `📏 Max request size: ${this.middlewareConfig.maxRequestSize} bytes`
      );
    }

    console.log("🔒 Security headers enabled");

    Bun.serve({
      port,
      development: this.assetConfig.isDev,
      fetch: (req: Request) => this.handleRequest(req),
    });

    onListen({
      port,
      serverRoutes: this.routeCache.serverRoutes,
      apiRoutes: this.routeCache.apiRoutes,
    });
  }

  /**
   * Get all configured paths (for debugging/testing)
   */
  getPaths(): string[] {
    return getAllPaths(this.routeCache);
  }

  /**
   * Get current asset cache state (for testing)
   */
  getAssetCacheState(): AssetCache {
    return { ...this.assetCache };
  }

  /**
   * Get current route cache state (for testing)
   */
  getRouteCacheState(): RouteCache {
    return {
      serverRoutes: new Map(this.routeCache.serverRoutes),
      apiRoutes: [...this.routeCache.apiRoutes],
      htmlCache: new Map(this.routeCache.htmlCache),
    };
  }
}
