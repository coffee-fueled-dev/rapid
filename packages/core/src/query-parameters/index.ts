/**
 * @rapid/core/query-params - Query Parameter Utilities
 *
 * Exports shared query parameter utilities that work in both environments.
 *
 * For environment-specific utilities:
 * - Client-side hooks: import from @rapid/core/query-params/client
 * - Server-side utilities: import from @rapid/core/query-params/server
 */

// Shared types and utilities
export type { QueryParams, QueryParamValue } from "./shared";

export {
  parseQueryString,
  stringifyQueryParams,
  mergeQueryParams,
} from "./shared";
