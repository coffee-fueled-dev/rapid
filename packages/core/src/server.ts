// Server-only exports for @protologic/rapid package

// Re-export types (for convenience)
export type {
  ApiRoute,
  ServerFunction,
  CSSCompiler,
  ServerRegistryOptions,
  Metadata,
} from "./types";

// Re-export Routes (for convenience)
export { Routes } from "./routes";

// Server-side registry and utilities
export { Registry as ServerRegistry } from "./server/index";

// Rate limiting and security middleware
export {
  rateLimiters,
  createRateLimitMiddleware,
  createRequestSizeLimitMiddleware,
  createSuspiciousActivityMiddleware,
  createCustomRateLimit,
} from "./server/middleware/rate-limiter";

// Server-side query parameter utilities
export type { ServerFunctionWithQuery } from "./server/query-params";
export {
  getQueryParams,
  getTypedQueryParams,
  withQueryParams,
  withQuery,
} from "./server/query-params";

// Server utilities (for advanced usage)
export { generateHTML } from "./server/generate-html";
export { compileClientBundle } from "./server/compile-client-bundle";
