// Main exports for @protologic/rapid package (client-safe)

// Core types (safe for both client and server)
export type {
  ApiRoute,
  ServerFunction,
  CSSCompiler,
  ServerRegistryOptions,
  Metadata,
  LayoutProps,
  SegmentOptions,
  SegmentDescriptor,
  PageSegmentDescriptor,
  ApiSegmentDescriptor,
  RoutesSegmentDescriptor,
} from "./types";

// Routes configuration (safe for both client and server)
export { Routes } from "./routes";

// Factory functions for declarative segment definition
export { page, api, routes } from "./routes/factories";

// Query parameter utilities (client-safe)
export type {
  QueryParams,
  QueryParamSchema,
  QueryParamValue,
} from "./query-params";
export {
  parseQueryString,
  stringifyQueryParams,
  parseQueryParams,
  mergeQueryParams,
  getQueryParam,
  getQueryParamArray,
} from "./query-params";

// Client-side registry (safe for browser)
export { Registry as ClientRegistry } from "./client";

// Lightweight navigation components (safe for browser)
export { Link, NavLink } from "./client/components";
export type { LinkProps, NavLinkProps } from "./client/components";
