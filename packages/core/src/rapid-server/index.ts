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

function preventClientExecution(methodName: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${methodName} can only be called on the server`);
  }
}

export interface RapidServerConfig {
  cssCompiler?: CSSCompiler;
  enableRateLimit?: boolean;
  maxRequestSize?: number;
  isDev?: boolean;
}

export class RapidServer {
  // Minimal state - just the caches and configs
  private assetCache: AssetCache;
  private routeCache: RouteCache;
  private assetConfig: AssetManagerConfig;
  private middlewareConfig: MiddlewareConfig;

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

    return result.response;
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
