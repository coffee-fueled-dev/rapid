import type { Routes } from "../routes";
import type {
  ServerRoute,
  CSSCompiler,
  ServerRegistryOptions,
  ApiRoute,
} from "../types";
import { handleAPIRequest } from "./handlers/api-request";
import { handleClientBundleRequest } from "./handlers/client-bundle-request";
import { handlePageRequest } from "./handlers/page-request";
import { compileClientBundle, getPrebuilt } from "./compile-client-bundle";
import { generateHTML } from "./generate-html";
import { onListen } from "./on-listen";
import {
  rateLimiters,
  createRateLimitMiddleware,
  createRequestSizeLimitMiddleware,
  createSuspiciousActivityMiddleware,
  createCustomRateLimit,
} from "./middleware/rate-limiter";

function preventClientExecution(methodName: string) {
  if (typeof window !== "undefined") {
    throw new Error(`${methodName} can only be called on the server`);
  }
}

export class Registry {
  private serverRoute = new Map<string, ServerRoute>();
  private apiRoutes: ApiRoute[] = [];
  private htmlCache = new Map<string, string>();
  private clientBundle: string | null = null;
  private cssBundle: string | null = null;
  private cssCompiler: CSSCompiler | null = null;
  private enableRateLimit: boolean;
  private maxRequestSize: number;

  constructor(
    options: ServerRegistryOptions & {
      enableRateLimit?: boolean;
      maxRequestSize?: number;
    } = {},
  ) {
    this.cssCompiler = options.cssCompiler || null;
    this.enableRateLimit = options.enableRateLimit ?? true;
    this.maxRequestSize = options.maxRequestSize ?? 1024 * 1024; // 1MB default
  }

  configureFromRoutes(routes: Routes) {
    const pageServerRoutes = routes.getServerRoute();
    for (const route of pageServerRoutes) {
      this.serverRoute.set(route.path, route);
    }
    console.log(
      `📋 Auto-configured ${pageServerRoutes.length} page route metadata`,
    );

    const apiRoutes = routes.getApiRoutes();
    for (const route of apiRoutes) {
      if (typeof window === "undefined") {
        this.apiRoutes.push(route);
      }
    }
    console.log(`🔌 Auto-configured ${apiRoutes.length} API routes`);
  }

  /**
   * Pre-compile all assets for static serving (Docker builds)
   */
  async precompile(): Promise<void> {
    preventClientExecution("precompile()");

    console.log("🔧 Pre-compiling application assets...");

    await this.getClientBundle();

    await this.getCSSBundle();

    for (const path of this.serverRoute.keys()) {
      this.getHTML(path);
    }

    console.log("✅ Pre-compilation complete");
  }

  getHTML(path: string): string | null {
    preventClientExecution("getHTML()");

    if (this.htmlCache.has(path)) {
      return this.htmlCache.get(path)!;
    }

    const serverRoute = this.serverRoute.get(path);
    if (!serverRoute) {
      return null;
    }

    const html = generateHTML(serverRoute, path);
    this.htmlCache.set(path, html);
    return html;
  }

  async getClientBundle(): Promise<string> {
    preventClientExecution("getClientBundle()");

    if (this.clientBundle) return this.clientBundle;

    this.clientBundle = await getPrebuilt("client.js");

    if (this.clientBundle) return this.clientBundle;

    this.clientBundle = await compileClientBundle();
    return this.clientBundle;
  }

  async getCSSBundle(): Promise<string> {
    preventClientExecution("getCSSBundle()");

    if (this.cssBundle) return this.cssBundle;

    this.cssBundle = await getPrebuilt("assets/styles.css");

    if (this.cssBundle) return this.cssBundle;

    try {
      if (!this.cssCompiler) {
        throw new Error("No CSS compiler provided to ServerRegistry");
      }

      this.cssBundle = await this.cssCompiler();
      return this.cssBundle;
    } catch (error) {
      console.error("❌ CSS compilation failed:", error);
      throw error;
    }
  }

  private async applyGlobalMiddleware(
    req: Request,
    url: URL,
  ): Promise<Response | null> {
    if (!this.enableRateLimit) return null;

    // Apply global rate limiting first
    const globalRateLimit = createRateLimitMiddleware(rateLimiters.global);
    const globalResult = await globalRateLimit(req, url);
    if (globalResult instanceof Response) {
      return globalResult;
    }

    // Apply request size limiting
    const sizeLimit = createRequestSizeLimitMiddleware(this.maxRequestSize);
    const sizeResult = await sizeLimit(req, url);
    if (sizeResult instanceof Response) {
      return sizeResult;
    }

    // Apply suspicious activity detection
    const suspiciousActivity = createSuspiciousActivityMiddleware();
    const suspiciousResult = await suspiciousActivity(req, url);
    if (suspiciousResult instanceof Response) {
      return suspiciousResult;
    }

    return null;
  }

  async handleRequest(req: Request): Promise<Response> {
    preventClientExecution("handleRequest()");

    const url = new URL(req.url);

    // Apply global middleware first
    const globalMiddlewareResult = await this.applyGlobalMiddleware(req, url);
    if (globalMiddlewareResult) {
      return globalMiddlewareResult;
    }

    // Check if this is an API route by looking at registered routes
    const isApiRoute = this.apiRoutes.some(
      (route) =>
        url.pathname === route.path ||
        url.pathname.startsWith(route.path + "/"),
    );

    if (isApiRoute) {
      // Find the matching API route to get its rate limit config
      const matchingApiRoute = this.apiRoutes.find(
        (route) =>
          url.pathname === route.path ||
          url.pathname.startsWith(route.path + "/"),
      );

      // Apply route-specific rate limiting if configured
      if (this.enableRateLimit && matchingApiRoute?.rateLimit) {
        const customRateLimit = createCustomRateLimit(
          matchingApiRoute.rateLimit,
          matchingApiRoute.path,
        );
        const customResult = await customRateLimit(req, url);
        if (customResult instanceof Response) {
          return customResult;
        }
      }

      const apiResponse = await handleAPIRequest(url, req, this.apiRoutes);
      if (apiResponse) {
        return apiResponse;
      }
    }

    if (url.pathname === "/styles.css") {
      try {
        const css = await this.getCSSBundle();
        const securityHeaders = {
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        };

        return new Response(css, {
          headers: {
            "Content-Type": "text/css",
            "Cache-Control": "no-cache",
            ...securityHeaders,
          },
        });
      } catch (error) {
        console.error("❌ CSS compilation failed:", error);
        const securityHeaders = {
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        };

        return new Response("/* CSS compilation failed */", {
          status: 500,
          headers: {
            "Content-Type": "text/css",
            ...securityHeaders,
          },
        });
      }
    }

    if (url.pathname === "/client.js") {
      return await handleClientBundleRequest(() => this.getClientBundle());
    }

    // Handle page routes with route-specific rate limiting
    const serverRoute = this.serverRoute.get(url.pathname);

    // Apply route-specific rate limiting if configured
    if (this.enableRateLimit && serverRoute?.rateLimit) {
      const customRateLimit = createCustomRateLimit(
        serverRoute.rateLimit,
        serverRoute.path,
      );
      const customResult = await customRateLimit(req, url);
      if (customResult instanceof Response) {
        return customResult;
      }
    }

    try {
      return await handlePageRequest(url, req, serverRoute, (path) =>
        this.getHTML(path),
      );
    } catch (error) {
      // 404 Not Found
      return new Response("Not Found", { status: 404 });
    }
  }

  async createServer(port: number = 3000): Promise<void> {
    preventClientExecution("createServer()");

    console.log("🔧 Starting development server...");

    if (this.enableRateLimit) {
      console.log("🛡️  Rate limiting enabled");
      console.log(`📏 Max request size: ${this.maxRequestSize} bytes`);
    }

    Bun.serve({
      port,
      development: true,
      fetch: (req: Request) => this.handleRequest(req),
    });

    onListen({
      port,
      serverRoutes: this.serverRoute,
      apiRoutes: this.apiRoutes,
    });
  }

  getPaths(): string[] {
    return Array.from(this.serverRoute.keys());
  }
}
