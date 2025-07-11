/**
 * Routes v2 - Functional Implementation
 *
 * A more functional approach to route management with:
 * - Immutable state management
 * - Pure functions for route processing
 * - Better testability
 * - Composable route logic
 */

import type { LayoutProps, ServerFunction } from "@/types";

// Import functional modules
import {
  createRouteState,
  addSegment,
  setLayout,
  setMiddleware,
  type RouteState,
} from "./route-state";

import {
  flattenRoutes,
  extractServerRoutes,
  extractPaths,
  filterRoutesByPattern,
  findRouteByPath,
  groupRoutes,
  type RouteContext,
  type FlattenResult,
} from "./route-functions";
import type { ClientRoute } from "@/rapid-client";
import type { ApiRoute, PageRoute } from "@/rapid-server/handlers";
import type { SegmentDescriptor } from "./factories";

/**
 * Routes class provides a unified API for defining both page and API routes
 * using a single `.segment()` method with hierarchical middleware and layouts.
 *
 * This functional version maintains the same public API while using immutable
 * state management and pure functions internally.
 *
 * @example
 * ```typescript
 * import { Routes, page, api, routes } from "@protologic/rapid";
 *
 * // Create nested routes with hierarchical middleware
 * const adminRoutes = new Routes()
 *   .middleware(requireAuth)
 *   .layout(AdminLayout)
 *   .segment("dashboard", page(DashboardPage, { title: "Admin Dashboard" }))
 *   .segment("users", page(UsersPage, { title: "User Management" }))
 *   .segment("api/users", api(handleUsersApi));
 *
 * // Main routes with layout applied to all
 * const routes = new Routes()
 *   .layout(MainLayout)
 *   .segment("/", page(HomePage, { title: "Home" }))
 *   .segment("/admin", routes(adminRoutes))
 *   .segment("/api/health", api(healthCheckHandler));
 * ```
 */
export class Routes {
  private state: RouteState;

  constructor() {
    this.state = createRouteState();
  }

  /**
   * Set a layout that applies to all subsequent routes and nested segments
   */
  layout(layoutComponent: React.ComponentType<LayoutProps>): this {
    this.state = setLayout(this.state, layoutComponent);
    return this;
  }

  /**
   * Set middleware that applies to all subsequent routes and nested segments
   */
  middleware(middlewareFunction: ServerFunction): this {
    this.state = setMiddleware(this.state, middlewareFunction);
    return this;
  }

  /**
   * Add a unified segment using declarative descriptors
   *
   * Use the factory functions for type-safe, declarative segment definition:
   * - `page(Component, metadata?)` for page routes
   * - `api(handler)` for API routes
   * - `routes(routesInstance)` for nested routes
   *
   * @example
   * ```typescript
   * import { page, api, routes } from "@protologic/rapid";
   *
   * .segment("/dashboard", page(DashboardPage, { title: "Dashboard" }))
   * .segment("/api/users", api(handleUsers))
   * .segment("/admin", routes(adminRoutes))
   * ```
   */
  segment(path: string, descriptor: SegmentDescriptor): this {
    this.state = addSegment(this.state, path, descriptor);
    return this;
  }

  /**
   * Flatten the hierarchical route structure into a flat list of Routes
   */
  getClientRoutes(): ClientRoute[] {
    const context: RouteContext = {
      basePath: "",
      parentLayouts: [],
      parentMiddleware: [],
    };

    const result = flattenRoutes(this.state, context);
    return result.clientRoutes;
  }

  /**
   * Get API routes
   */
  getApiRoutes(): ApiRoute[] {
    const context: RouteContext = {
      basePath: "",
      parentLayouts: [],
      parentMiddleware: [],
    };

    const result = flattenRoutes(this.state, context);
    return result.apiRoutes;
  }

  /**
   * Get server routes (without components and layouts)
   */
  getServerRoute(): PageRoute[] {
    const pageRoutes = this.getClientRoutes();
    return extractServerRoutes(pageRoutes);
  }

  /**
   * Get page paths
   */
  getPagePaths(): string[] {
    const pageRoutes = this.getClientRoutes();
    return extractPaths(pageRoutes);
  }

  /**
   * Get API paths
   */
  getApiPaths(): string[] {
    const apiRoutes = this.getApiRoutes();
    return extractPaths(apiRoutes);
  }

  /**
   * Get current state (for testing and debugging)
   */
  getState(): RouteState {
    return { ...this.state };
  }

  // Additional functional methods enabled by the new architecture

  /**
   * Find a page route by exact path
   */
  findRoute(path: string): ClientRoute | undefined {
    const pageRoutes = this.getClientRoutes();
    return findRouteByPath(pageRoutes, path);
  }

  /**
   * Find an API route by exact path
   */
  findApiRoute(path: string): ApiRoute | undefined {
    const apiRoutes = this.getApiRoutes();
    return findRouteByPath(apiRoutes, path);
  }

  /**
   * Filter page routes by path pattern
   */
  filterRoutes(pattern: RegExp): ClientRoute[] {
    const pageRoutes = this.getClientRoutes();
    return filterRoutesByPattern(pageRoutes, pattern);
  }

  /**
   * Filter API routes by path pattern
   */
  filterApiRoutes(pattern: RegExp): ApiRoute[] {
    const apiRoutes = this.getApiRoutes();
    return filterRoutesByPattern(apiRoutes, pattern);
  }

  /**
   * Group page routes by a custom key function
   */
  groupRoutes<K extends string | number | symbol>(
    keyFn: (route: ClientRoute) => K
  ): Record<K, ClientRoute[]> {
    const pageRoutes = this.getClientRoutes();
    return groupRoutes(pageRoutes, keyFn);
  }

  /**
   * Group API routes by a custom key function
   */
  groupApiRoutes<K extends string | number | symbol>(
    keyFn: (route: ApiRoute) => K
  ): Record<K, ApiRoute[]> {
    const apiRoutes = this.getApiRoutes();
    return groupRoutes(apiRoutes, keyFn);
  }

  /**
   * Get all routes (both page and API) as a combined result
   */
  getAllRoutes(): FlattenResult {
    const context: RouteContext = {
      basePath: "",
      parentLayouts: [],
      parentMiddleware: [],
    };

    return flattenRoutes(this.state, context);
  }

  /**
   * Check if any routes are defined
   */
  hasRoutes(): boolean {
    return this.state.segments.length > 0;
  }

  /**
   * Get the number of segments defined
   */
  getSegmentCount(): number {
    return this.state.segments.length;
  }

  /**
   * Clone the routes instance (useful for creating variations)
   */
  clone(): Routes {
    const cloned = new Routes();
    cloned.state = { ...this.state };
    return cloned;
  }
}
