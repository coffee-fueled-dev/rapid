/**
 * Route Management Module
 *
 * Functional module for managing route configuration and HTML generation.
 * Pure functions with explicit state management.
 */

import type { Routes } from "@/routes";
import type { PageRoute, ApiRoute } from "@/rapid-server/handlers";
import { generateHTML } from "../util";

export interface RouteCache {
  serverRoutes: Map<string, PageRoute>;
  apiRoutes: ApiRoute[];
  htmlCache: Map<string, string>;
}

/**
 * Create initial route cache
 */
export function createRouteCache(): RouteCache {
  return {
    serverRoutes: new Map(),
    apiRoutes: [],
    htmlCache: new Map(),
  };
}

/**
 * Configure routes from Routes instance (pure function)
 */
export function configureRoutes(routes: Routes): RouteCache {
  const serverRoutes = new Map<string, PageRoute>();
  const pageServerRoutes = routes.getServerRoute();

  for (const route of pageServerRoutes) {
    serverRoutes.set(route.path, route);
  }

  const apiRoutes = routes.getApiRoutes().filter(() => {
    // Only include API routes on server side
    return typeof window === "undefined";
  });

  console.log(
    `📋 Auto-configured ${pageServerRoutes.length} page route metadata`
  );
  console.log(`🔌 Auto-configured ${apiRoutes.length} API routes`);

  return {
    serverRoutes,
    apiRoutes,
    htmlCache: new Map(), // Reset HTML cache when routes change
  };
}

/**
 * Get HTML for a path (with caching)
 */
export function getHTML(
  cache: RouteCache,
  path: string
): { html: string | null; updatedCache: RouteCache } {
  // Check cache first
  if (cache.htmlCache.has(path)) {
    return { html: cache.htmlCache.get(path)!, updatedCache: cache };
  }

  // Get server route
  const serverRoute = cache.serverRoutes.get(path);
  if (!serverRoute) {
    return { html: null, updatedCache: cache };
  }

  // Generate HTML
  const html = generateHTML(serverRoute, path);

  // Update cache
  const updatedCache: RouteCache = {
    ...cache,
    htmlCache: new Map(cache.htmlCache).set(path, html),
  };

  return { html, updatedCache };
}

/**
 * Pre-generate HTML for all routes
 */
export function precompileHTML(cache: RouteCache): RouteCache {
  let updatedCache = cache;

  for (const path of cache.serverRoutes.keys()) {
    const result = getHTML(updatedCache, path);
    updatedCache = result.updatedCache;
  }

  return updatedCache;
}

/**
 * Find matching API route for a path
 */
export function findApiRoute(
  cache: RouteCache,
  pathname: string
): ApiRoute | null {
  return (
    cache.apiRoutes.find(
      (route) =>
        pathname === route.path || pathname.startsWith(route.path + "/")
    ) || null
  );
}

/**
 * Check if a path is an API route
 */
export function isApiRoute(cache: RouteCache, pathname: string): boolean {
  return findApiRoute(cache, pathname) !== null;
}

/**
 * Get all configured paths
 */
export function getAllPaths(cache: RouteCache): string[] {
  return Array.from(cache.serverRoutes.keys());
}
