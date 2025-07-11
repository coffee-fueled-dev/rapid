/**
 * @rapid/core/client - Client-Side Entry Point
 *
 * Exports client-side React components, hooks, and utilities.
 * Only imports that are safe for browser environments.
 */

// Re-export shared utilities
export * from "./index";

// Client-side application runner
export { RapidClient } from "./rapid-client";
export type { ClientRoute } from "./rapid-client";

// React components for navigation
export { Link, NavLink } from "./components/link";
export type { LinkProps, NavLinkProps } from "./components/link";

// Client-side query parameter hooks
export {
  useQueryParams,
  useQueryParam,
  useQueryParamArray,
} from "./query-parameters/client";
