/**
 * Route Processing Functions
 *
 * Pure functions for route processing, path joining, and route flattening.
 * These functions have no side effects and are easily testable.
 */

import type { LayoutProps, ServerFunction } from "@/types";
import type { SegmentEntry, RouteState } from "./route-state";
import type { ClientRoute } from "@/rapid-client";
import type { ApiRoute, PageRoute } from "@/rapid-server/handlers";

export interface RouteContext {
  basePath: string;
  parentLayouts: React.ComponentType<LayoutProps>[];
  parentMiddleware: ServerFunction[];
}

export interface FlattenResult {
  clientRoutes: ClientRoute[];
  apiRoutes: ApiRoute[];
}

/**
 * Join path segments, handling leading/trailing slashes
 */
export function joinPaths(base: string, path: string): string {
  if (!base) return path;
  if (!path) return base;

  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${cleanBase}/${cleanPath}`;
}

/**
 * Build layout hierarchy by combining parent and current layouts
 */
export function buildLayoutHierarchy(
  parentLayouts: React.ComponentType<LayoutProps>[],
  currentLayout?: React.ComponentType<LayoutProps>
): React.ComponentType<LayoutProps>[] {
  return currentLayout ? [...parentLayouts, currentLayout] : parentLayouts;
}

/**
 * Build middleware stack by combining parent and current middleware
 */
export function buildMiddlewareStack(
  parentMiddleware: ServerFunction[],
  currentMiddleware?: ServerFunction
): ServerFunction[] {
  return currentMiddleware
    ? [...parentMiddleware, currentMiddleware]
    : parentMiddleware;
}

/**
 * Normalize middleware for route output
 */
export function normalizeMiddleware(
  middlewareStack: ServerFunction[]
): ServerFunction | ServerFunction[] | undefined {
  if (middlewareStack.length === 0) return undefined;
  if (middlewareStack.length === 1) return middlewareStack[0];
  return middlewareStack;
}

/**
 * Create a client route from a segment entry and context
 */
export function createClientRoute(
  segmentEntry: SegmentEntry,
  fullPath: string,
  layouts: React.ComponentType<LayoutProps>[],
  middleware: ServerFunction[]
): ClientRoute {
  const { resolver } = segmentEntry.options;

  if (resolver._type !== "page") {
    throw new Error(`Expected page segment, got ${resolver._type}`);
  }

  return {
    path: fullPath,
    component: resolver.component,
    layouts,
    metadata: resolver.metadata || { title: `Page ${fullPath}` },
    middleware: normalizeMiddleware(middleware),
    rateLimit: resolver.rateLimit,
  };
}

/**
 * Create an API route from a segment entry and context
 */
export function createApiRoute(
  segmentEntry: SegmentEntry,
  fullPath: string,
  middleware: ServerFunction[]
): ApiRoute {
  const { resolver } = segmentEntry.options;

  if (resolver._type !== "api") {
    throw new Error(`Expected api segment, got ${resolver._type}`);
  }

  return {
    path: fullPath,
    handler: resolver.handler,
    middleware: normalizeMiddleware(middleware),
    rateLimit: resolver.rateLimit,
  };
}

/**
 * Check if we're in a server environment for API route processing
 */
export function isServerEnvironment(): boolean {
  return typeof window === "undefined";
}

/**
 * Flatten routes recursively using functional approach
 */
export function flattenRoutes(
  state: RouteState,
  context: RouteContext
): FlattenResult {
  const clientRoutes: ClientRoute[] = [];
  const apiRoutes: ApiRoute[] = [];

  // Build current context
  const currentLayouts = buildLayoutHierarchy(
    context.parentLayouts,
    state.currentLayout
  );

  const currentMiddlewareStack = buildMiddlewareStack(
    context.parentMiddleware,
    state.currentMiddleware
  );

  // Process each segment
  for (const segmentEntry of state.segments) {
    const fullPath = joinPaths(context.basePath, segmentEntry.path);
    const { resolver } = segmentEntry.options;

    if (resolver._type === "page") {
      // Create page route
      const clientRoute = createClientRoute(
        segmentEntry,
        fullPath,
        currentLayouts,
        currentMiddlewareStack
      );
      clientRoutes.push(clientRoute);
    } else if (resolver._type === "api") {
      // Create API route (only on server)
      if (isServerEnvironment()) {
        const apiRoute = createApiRoute(
          segmentEntry,
          fullPath,
          currentMiddlewareStack
        );
        apiRoutes.push(apiRoute);
      }
    } else if (resolver._type === "routes") {
      // Recursively flatten nested routes
      const nestedContext: RouteContext = {
        basePath: fullPath,
        parentLayouts: currentLayouts,
        parentMiddleware: currentMiddlewareStack,
      };

      // Get the nested routes state and flatten recursively
      const nestedRoutes = resolver.routes;
      const nestedState = nestedRoutes.getState();
      const nestedResult = flattenRoutes(nestedState, nestedContext);

      clientRoutes.push(...nestedResult.clientRoutes);
      apiRoutes.push(...nestedResult.apiRoutes);
    }
  }

  return { clientRoutes, apiRoutes };
}

/**
 * Extract server routes from page routes
 */
export function extractServerRoutes(clientRoutes: ClientRoute[]): PageRoute[] {
  return clientRoutes.map(
    ({ component, layouts, ...serverRoute }) => serverRoute
  );
}

/**
 * Extract paths from routes
 */
export function extractPaths<T extends { path: string }>(
  routes: T[]
): string[] {
  return routes.map((route) => route.path);
}

/**
 * Filter routes by path pattern
 */
export function filterRoutesByPattern<T extends { path: string }>(
  routes: T[],
  pattern: RegExp
): T[] {
  return routes.filter((route) => pattern.test(route.path));
}

/**
 * Find route by exact path
 */
export function findRouteByPath<T extends { path: string }>(
  routes: T[],
  path: string
): T | undefined {
  return routes.find((route) => route.path === path);
}

/**
 * Group routes by a key function
 */
export function groupRoutes<T, K extends string | number | symbol>(
  routes: T[],
  keyFn: (route: T) => K
): Record<K, T[]> {
  return routes.reduce((groups, route) => {
    const key = keyFn(route);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(route);
    return groups;
  }, {} as Record<K, T[]>);
}
