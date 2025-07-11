import React from "react";

export interface Metadata {
  title: string;
  description?: string;
}

/**
 * Rate limiting configuration for routes
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Maximum requests per window */
  max?: number;
  /** Custom error message */
  message?: string | { error: string; message: string };
  /** Skip rate limiting for this route */
  skip?: boolean;
}

export type ResponseModifier = (
  response: Response,
) => Response | Promise<Response>;

export type MiddlewareResult = Response | ResponseModifier | null;

export type ServerFunction = (
  req: Request,
  url: URL,
) => Promise<MiddlewareResult> | MiddlewareResult;

/**
 * Layout component props (compatible with hierarchical routing)
 */
export interface LayoutProps {
  children?: React.ReactNode;
}

/**
 * Forward declaration for recursive Routes
 */
export interface Routes {
  getPageRoutes(): PageRoute[];
  getApiRoutes(): ApiRoute[];
}

/**
 * Segment descriptors for declarative route definition
 */
export interface PageSegmentDescriptor {
  _type: "page";
  component: React.ComponentType;
  metadata?: Metadata;
  rateLimit?: RateLimitConfig;
}

export interface ApiSegmentDescriptor {
  _type: "api";
  handler: ServerFunction;
  rateLimit?: RateLimitConfig;
}

export interface RoutesSegmentDescriptor {
  _type: "routes";
  routes: Routes;
  rateLimit?: RateLimitConfig;
}

export type SegmentDescriptor =
  | PageSegmentDescriptor
  | ApiSegmentDescriptor
  | RoutesSegmentDescriptor;

/**
 * Unified segment configuration options
 */
export interface SegmentOptions {
  resolver: SegmentDescriptor;
}

/**
 * Internal page route representation (flattened from hierarchy)
 */
export interface PageRoute {
  path: string;
  component: React.ComponentType;
  layouts: React.ComponentType<LayoutProps>[];
  metadata: Metadata;
  middleware?: ServerFunction | ServerFunction[];
  rateLimit?: RateLimitConfig;
}

/**
 * Internal server route representation (without component and layouts)
 */
export interface ServerRoute {
  path: string;
  metadata: Metadata;
  middleware?: ServerFunction | ServerFunction[];
  rateLimit?: RateLimitConfig;
}

/**
 * Internal API route representation (with path added)
 */
export interface ApiRoute {
  path: string;
  handler: ServerFunction;
  middleware?: ServerFunction | ServerFunction[];
  rateLimit?: RateLimitConfig;
}

/**
 * CSS compilation function type
 */
export type CSSCompiler = () => Promise<string>;

/**
 * Server registry configuration options
 */
export interface ServerRegistryOptions {
  /** CSS compilation function */
  cssCompiler?: CSSCompiler;
  /** Enable rate limiting and DoS protection (default: true) */
  enableRateLimit?: boolean;
  /** Maximum request size in bytes (default: 1MB) */
  maxRequestSize?: number;
}
