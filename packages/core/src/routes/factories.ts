import React from "react";
import type { ServerFunction, Metadata } from "@/types";
import type { RateLimitConfig } from "@/rapid-server/middleware/rate-limiter";
import type { Routes } from ".";

export type SegmentDescriptor =
  | PageSegmentDescriptor
  | ApiSegmentDescriptor
  | RoutesSegmentDescriptor;

/**
 * Create a page segment descriptor
 *
 * @example
 * ```typescript
 * .segment("/dashboard", page(DashboardComponent, {
 *   title: "Dashboard",
 *   description: "Main dashboard page"
 * }, {
 *   windowMs: 60000,
 *   max: 100
 * }))
 * ```
 */
export function page(
  component: React.ComponentType,
  metadata?: Metadata,
  rateLimit?: RateLimitConfig
): PageSegmentDescriptor {
  return {
    _type: "page",
    component,
    metadata,
    rateLimit,
  };
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

/**
 * Create an API segment descriptor
 *
 * @example
 * ```typescript
 * .segment("/api/users", api(handleUsers, {
 *   windowMs: 60000,
 *   max: 50
 * }))
 * ```
 */
export function api(
  handler: ServerFunction,
  rateLimit?: RateLimitConfig
): ApiSegmentDescriptor {
  return {
    _type: "api",
    handler,
    rateLimit,
  };
}
export interface ApiSegmentDescriptor {
  _type: "api";
  handler: ServerFunction;
  rateLimit?: RateLimitConfig;
}

/**
 * Create a nested routes segment descriptor
 *
 * @example
 * ```typescript
 * .segment("/admin", routes(adminRoutes, {
 *   windowMs: 60000,
 *   max: 200
 * }))
 * ```
 */
export function routes(
  routesInstance: Routes,
  rateLimit?: RateLimitConfig
): RoutesSegmentDescriptor {
  return {
    _type: "routes",
    routes: routesInstance,
    rateLimit,
  };
}
export interface RoutesSegmentDescriptor {
  _type: "routes";
  routes: Routes;
  rateLimit?: RateLimitConfig;
}
