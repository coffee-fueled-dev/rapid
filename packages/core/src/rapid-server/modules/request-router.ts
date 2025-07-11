/**
 * Request Router Module
 *
 * Functional module for routing HTTP requests to appropriate handlers.
 * Pure functions that determine how requests should be handled.
 */

import type { RouteCache } from "./route-manager";
import type { AssetCache, AssetManagerConfig } from "./asset-manager";
import {
  getClientBundle,
  getCSSBundle,
  createAssetResponse,
  createAssetErrorResponse,
} from "./asset-manager";
import { getHTML, findApiRoute, isApiRoute } from "./route-manager";
import { handleAPIRequest, handlePageRequest } from "../handlers";
import {
  createRateLimitMiddleware,
  createRequestSizeLimitMiddleware,
  createSuspiciousActivityMiddleware,
  createCustomRateLimit,
  rateLimiters,
} from "../middleware/rate-limiter";

export interface MiddlewareConfig {
  enableRateLimit: boolean;
  maxRequestSize: number;
}

export interface RequestContext {
  req: Request;
  url: URL;
  routeCache: RouteCache;
  assetCache: AssetCache;
  assetConfig: AssetManagerConfig;
  middlewareConfig: MiddlewareConfig;
}

export interface RequestResult {
  response: Response;
  updatedAssetCache: AssetCache;
  updatedRouteCache: RouteCache;
}

/**
 * Apply global middleware to a request
 */
export async function applyGlobalMiddleware(
  req: Request,
  url: URL,
  config: MiddlewareConfig
): Promise<Response | null> {
  if (!config.enableRateLimit) return null;

  // Apply global rate limiting first
  const globalRateLimit = createRateLimitMiddleware(rateLimiters.global);
  const globalResult = await globalRateLimit(req, url);
  if (globalResult instanceof Response) {
    return globalResult;
  }

  // Apply request size limiting
  const sizeLimit = createRequestSizeLimitMiddleware(config.maxRequestSize);
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

/**
 * Handle CSS asset request
 */
export async function handleCSSRequest(
  assetCache: AssetCache,
  assetConfig: AssetManagerConfig
): Promise<{ response: Response; updatedCache: AssetCache }> {
  try {
    const { bundle, updatedCache } = await getCSSBundle(
      assetCache,
      assetConfig
    );
    const response = createAssetResponse(bundle, "text/css", assetConfig.isDev);
    return { response, updatedCache };
  } catch (error) {
    console.error("❌ CSS compilation failed:", error);
    const response = createAssetErrorResponse(
      "text/css",
      "/* CSS compilation failed */"
    );
    return { response, updatedCache: assetCache };
  }
}

/**
 * Handle client JS bundle request
 */
export async function handleClientJSRequest(
  assetCache: AssetCache,
  assetConfig: AssetManagerConfig
): Promise<{ response: Response; updatedCache: AssetCache }> {
  try {
    const { bundle, updatedCache } = await getClientBundle(
      assetCache,
      assetConfig
    );
    const response = createAssetResponse(
      bundle,
      "application/javascript",
      assetConfig.isDev
    );
    return { response, updatedCache };
  } catch (error) {
    console.error("❌ Client bundle failed:", error);
    const response = createAssetErrorResponse(
      "application/javascript",
      "// Client bundling error"
    );
    return { response, updatedCache: assetCache };
  }
}

/**
 * Handle API request
 */
export async function handleAPIRouteRequest(
  req: Request,
  url: URL,
  routeCache: RouteCache,
  middlewareConfig: MiddlewareConfig
): Promise<Response | null> {
  const matchingApiRoute = findApiRoute(routeCache, url.pathname);
  if (!matchingApiRoute) {
    return null;
  }

  // Apply route-specific rate limiting if configured
  if (middlewareConfig.enableRateLimit && matchingApiRoute.rateLimit) {
    const customRateLimit = createCustomRateLimit(
      matchingApiRoute.rateLimit,
      matchingApiRoute.path
    );
    const customResult = await customRateLimit(req, url);
    if (customResult instanceof Response) {
      return customResult;
    }
  }

  return await handleAPIRequest(url, req, routeCache.apiRoutes);
}

/**
 * Handle page request
 */
export async function handlePageRouteRequest(
  req: Request,
  url: URL,
  routeCache: RouteCache,
  middlewareConfig: MiddlewareConfig
): Promise<{ response: Response; updatedCache: RouteCache }> {
  const serverRoute = routeCache.serverRoutes.get(url.pathname);

  // Apply route-specific rate limiting if configured
  if (middlewareConfig.enableRateLimit && serverRoute?.rateLimit) {
    const customRateLimit = createCustomRateLimit(
      serverRoute.rateLimit,
      serverRoute.path
    );
    const customResult = await customRateLimit(req, url);
    if (customResult instanceof Response) {
      return { response: customResult, updatedCache: routeCache };
    }
  }

  try {
    // Get HTML with caching
    const { html, updatedCache } = getHTML(routeCache, url.pathname);

    if (!html) {
      throw new Error(`Failed to get HTML for ${url.pathname}`);
    }

    const response = await handlePageRequest(url, req, serverRoute, () => html);

    return { response, updatedCache };
  } catch (error) {
    const response = new Response("Not Found", { status: 404 });
    return { response, updatedCache: routeCache };
  }
}

/**
 * Route a request to the appropriate handler
 */
export async function routeRequest(
  context: RequestContext
): Promise<RequestResult> {
  const { req, url, routeCache, assetCache, assetConfig, middlewareConfig } =
    context;

  // Apply global middleware first
  const globalMiddlewareResult = await applyGlobalMiddleware(
    req,
    url,
    middlewareConfig
  );
  if (globalMiddlewareResult) {
    return {
      response: globalMiddlewareResult,
      updatedAssetCache: assetCache,
      updatedRouteCache: routeCache,
    };
  }

  // Handle CSS requests
  if (url.pathname === "/styles.css") {
    const { response, updatedCache } = await handleCSSRequest(
      assetCache,
      assetConfig
    );
    return {
      response,
      updatedAssetCache: updatedCache,
      updatedRouteCache: routeCache,
    };
  }

  // Handle client JS requests
  if (url.pathname === "/client.js") {
    const { response, updatedCache } = await handleClientJSRequest(
      assetCache,
      assetConfig
    );
    return {
      response,
      updatedAssetCache: updatedCache,
      updatedRouteCache: routeCache,
    };
  }

  // Handle API requests
  if (isApiRoute(routeCache, url.pathname)) {
    const apiResponse = await handleAPIRouteRequest(
      req,
      url,
      routeCache,
      middlewareConfig
    );
    if (apiResponse) {
      return {
        response: apiResponse,
        updatedAssetCache: assetCache,
        updatedRouteCache: routeCache,
      };
    }
  }

  // Handle page requests (fallback)
  const { response, updatedCache } = await handlePageRouteRequest(
    req,
    url,
    routeCache,
    middlewareConfig
  );
  return {
    response,
    updatedAssetCache: assetCache,
    updatedRouteCache: updatedCache,
  };
}
