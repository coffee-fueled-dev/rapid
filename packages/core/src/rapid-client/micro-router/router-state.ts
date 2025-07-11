/**
 * Router State Management
 *
 * Functional state management for the MicroRouter.
 * Separates state from behavior for better testability and dynamic route management.
 */

import type { ClientRoute } from "@/rapid-client";

export interface RouterState {
  routes: Map<string, ClientRoute>;
  currentPath: string;
  currentRoute: ClientRoute | null;
  renderCallback: ((element: React.ReactElement) => void) | null;
}

/**
 * Create initial router state
 */
export function createRouterState(): RouterState {
  return {
    routes: new Map(),
    currentPath: "",
    currentRoute: null,
    renderCallback: null,
  };
}

/**
 * Update routes in state (supports dynamic route management)
 */
export function updateRoutes(
  state: RouterState,
  routes: ClientRoute[]
): RouterState {
  const newRoutesMap = new Map<string, ClientRoute>();
  for (const route of routes) {
    newRoutesMap.set(route.path, route);
  }

  return {
    ...state,
    routes: newRoutesMap,
  };
}

/**
 * Add a single route dynamically
 */
export function addRoute(state: RouterState, route: ClientRoute): RouterState {
  const newRoutes = new Map(state.routes);
  newRoutes.set(route.path, route);

  return {
    ...state,
    routes: newRoutes,
  };
}

/**
 * Remove a route dynamically
 */
export function removeRoute(state: RouterState, path: string): RouterState {
  const newRoutes = new Map(state.routes);
  newRoutes.delete(path);

  return {
    ...state,
    routes: newRoutes,
  };
}

/**
 * Update current navigation state
 */
export function updateCurrentRoute(
  state: RouterState,
  path: string,
  route: ClientRoute | null
): RouterState {
  return {
    ...state,
    currentPath: path,
    currentRoute: route,
  };
}

/**
 * Set render callback
 */
export function setRenderCallback(
  state: RouterState,
  callback: ((element: React.ReactElement) => void) | null
): RouterState {
  return {
    ...state,
    renderCallback: callback,
  };
}

/**
 * Get route by path
 */
export function getRoute(
  state: RouterState,
  path: string
): ClientRoute | undefined {
  return state.routes.get(path);
}

/**
 * Check if a route exists
 */
export function hasRoute(state: RouterState, path: string): boolean {
  return state.routes.has(path);
}

/**
 * Get all route paths
 */
export function getAllPaths(state: RouterState): string[] {
  return Array.from(state.routes.keys());
}

/**
 * Get all routes as array
 */
export function getAllRoutes(state: RouterState): ClientRoute[] {
  return Array.from(state.routes.values());
}
