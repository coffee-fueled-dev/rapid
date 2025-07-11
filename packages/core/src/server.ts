/**
 * @rapid/core/server - Server-Side Entry Point
 *
 * Exports server-side utilities, handlers, and middleware.
 * Only imports that are safe for Node.js/Bun server environments.
 */

// Re-export shared utilities
export * from "./index";

// Server application runner
export { RapidServer } from "./rapid-server";
export type { RapidServerConfig } from "./rapid-server";

// Server module types
export type {
  AssetCache,
  AssetManagerConfig,
} from "./rapid-server/modules/asset-manager";

export type { RouteCache } from "./rapid-server/modules/route-manager";

export type { MiddlewareConfig } from "./rapid-server/modules/request-router";

// Server-side route types
export type { ApiRoute, PageRoute } from "./rapid-server/handlers";

// Server middleware
export {
  createRateLimitMiddleware,
  createRequestSizeLimitMiddleware,
  createSuspiciousActivityMiddleware,
  createCustomRateLimit,
} from "./rapid-server/middleware/rate-limiter";

export type { RateLimitConfig } from "./rapid-server/middleware/rate-limiter";

// Server-side query parameter utilities
export { withQuery, getQuery } from "./query-parameters/server";

export type { ServerFunctionWithQuery } from "./query-parameters/server";
