import type {
  PageRoute,
  ServerRoute,
  ApiRoute,
  SegmentOptions,
  SegmentDescriptor,
  LayoutProps,
  ServerFunction,
} from "../types";

interface SegmentEntry {
  path: string;
  options: SegmentOptions;
}

/**
 * Routes class provides a unified API for defining both page and API routes
 * using a single `.segment()` method with hierarchical middleware and layouts.
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
 *
 * Key features:
 * - Unified `.segment()` method with declarative descriptors
 * - Hierarchical middleware application (top-down)
 * - Hierarchical layout application (top-down)
 * - Type-safe segment descriptors (page(), api(), routes())
 */
export class Routes {
  private segments: SegmentEntry[] = [];
  private currentLayout?: React.ComponentType<LayoutProps>;
  private currentMiddleware?: ServerFunction;

  /**
   * Set a layout that applies to all subsequent routes and nested segments
   */
  layout(layoutComponent: React.ComponentType<LayoutProps>): this {
    this.currentLayout = layoutComponent;
    return this;
  }

  /**
   * Set middleware that applies to all subsequent routes and nested segments
   */
  middleware(middlewareFunction: ServerFunction): this {
    this.currentMiddleware = middlewareFunction;
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
    this.segments.push({ path, options: { resolver: descriptor } });
    return this;
  }

  /**
   * Flatten the hierarchical route structure into a flat list of PageRoutes
   */
  getPageRoutes(): PageRoute[] {
    return this.flattenRoutes("", [], []);
  }

  /**
   * Get API routes
   */
  getApiRoutes(): ApiRoute[] {
    return this.flattenApiRoutes("", []);
  }

  /**
   * Get server routes (without components and layouts)
   */
  getServerRoute(): ServerRoute[] {
    return this.getPageRoutes().map(
      ({ component, layouts, ...serverRoute }) => serverRoute,
    );
  }

  /**
   * Get page paths
   */
  getPagePaths(): string[] {
    return this.getPageRoutes().map((route) => route.path);
  }

  /**
   * Get API paths
   */
  getApiPaths(): string[] {
    return this.getApiRoutes().map((route) => route.path);
  }

  /**
   * Recursively flatten routes, building up layout and middleware hierarchy and concatenating paths
   */
  private flattenRoutes(
    basePath: string,
    parentLayouts: React.ComponentType<LayoutProps>[],
    parentMiddleware: ServerFunction[],
  ): PageRoute[] {
    const flattened: PageRoute[] = [];

    // Current layout stack (parent layouts + current layout)
    const currentLayouts = this.currentLayout
      ? [...parentLayouts, this.currentLayout]
      : parentLayouts;

    // Current middleware stack (parent middleware + current middleware)
    const currentMiddlewareStack = this.currentMiddleware
      ? [...parentMiddleware, this.currentMiddleware]
      : parentMiddleware;

    // Process unified segments
    for (const { path, options } of this.segments) {
      const fullPath = this.joinPaths(basePath, path);
      const { resolver } = options;

      // Handle different segment types declaratively
      if (resolver._type === "page") {
        // It's a page segment
        flattened.push({
          path: fullPath,
          component: resolver.component,
          layouts: currentLayouts,
          metadata: resolver.metadata || { title: `Page ${fullPath}` },
          middleware:
            currentMiddlewareStack.length === 1
              ? currentMiddlewareStack[0]
              : currentMiddlewareStack.length > 1
                ? currentMiddlewareStack
                : undefined,
          rateLimit: resolver.rateLimit,
        });
      } else if (resolver._type === "routes") {
        // It's nested routes - recursively flatten
        const nestedRoutes = (resolver.routes as Routes)
          .flattenRoutes(fullPath, currentLayouts, currentMiddlewareStack)
          .map((route: PageRoute) => ({
            ...route,
            path: route.path, // Path is already computed in recursive call
          }));
        flattened.push(...nestedRoutes);
      }
      // Skip API segments in page route flattening
    }

    return flattened;
  }

  /**
   * Recursively flatten API routes from unified segments
   */
  private flattenApiRoutes(
    basePath: string,
    parentMiddleware: ServerFunction[],
  ): ApiRoute[] {
    // Only process on server-side
    if (typeof window !== "undefined") {
      return [];
    }

    const flattened: ApiRoute[] = [];

    // Current middleware stack (parent middleware + current middleware)
    const currentMiddlewareStack = this.currentMiddleware
      ? [...parentMiddleware, this.currentMiddleware]
      : parentMiddleware;

    // Process unified segments
    for (const { path, options } of this.segments) {
      const fullPath = this.joinPaths(basePath, path);
      const { resolver } = options;

      if (resolver._type === "api") {
        // It's an API segment
        flattened.push({
          path: fullPath,
          handler: resolver.handler,
          middleware:
            currentMiddlewareStack.length === 1
              ? currentMiddlewareStack[0]
              : currentMiddlewareStack.length > 1
                ? currentMiddlewareStack
                : undefined,
          rateLimit: resolver.rateLimit,
        });
      } else if (resolver._type === "routes") {
        // It's nested routes - recursively flatten
        const nestedApiRoutes = (resolver.routes as Routes).flattenApiRoutes(
          fullPath,
          currentMiddlewareStack,
        );
        flattened.push(...nestedApiRoutes);
      }
      // Skip page segments in API route flattening
    }

    return flattened;
  }

  /**
   * Join path segments, handling leading/trailing slashes
   */
  private joinPaths(base: string, path: string): string {
    if (!base) return path;
    if (!path) return base;

    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    return `${cleanBase}/${cleanPath}`;
  }
}
