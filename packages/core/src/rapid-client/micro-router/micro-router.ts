/**
 * MicroRouter v2 - Functional Implementation
 *
 * A more functional approach to client-side routing with:
 * - Immutable state management
 * - Pure functions for navigation logic
 * - Support for dynamic route management
 * - Better testability
 */

import React from "react";
import type { ClientRoute } from "@/rapid-client";

// Import functional modules
import {
  createRouterState,
  updateRoutes,
  addRoute,
  removeRoute,
  updateCurrentRoute,
  setRenderCallback,
  getRoute,
  hasRoute,
  type RouterState,
} from "./router-state";

import {
  isInternalLink,
  analyzeNavigationResponse,
  calculatePreservedLayouts,
  createRouteElementWithPreservation,
  dispatchNavigationEvent,
  shouldSkipNavigation,
  createNavigationFetchOptions,
  type NavigationResult,
} from "./navigation-functions";

export class MicroRouter {
  private state: RouterState;

  constructor() {
    this.state = createRouterState();
  }

  /**
   * Configure routes (supports dynamic updates)
   */
  configureRoutes(routes: ClientRoute[]): void {
    this.state = updateRoutes(this.state, routes);
  }

  /**
   * Add a single route dynamically
   */
  addRoute(route: ClientRoute): void {
    this.state = addRoute(this.state, route);
  }

  /**
   * Remove a route dynamically
   */
  removeRoute(path: string): void {
    this.state = removeRoute(this.state, path);
  }

  /**
   * Check if a route exists
   */
  hasRoute(path: string): boolean {
    return hasRoute(this.state, path);
  }

  /**
   * Set render callback
   */
  setRenderCallback(callback: (element: React.ReactElement) => void): void {
    this.state = setRenderCallback(this.state, callback);
  }

  /**
   * Initialize router with event listeners
   */
  initialize(): void {
    if (typeof window === "undefined") return;

    // Handle initial route - always go through server
    this.navigateWithServer(window.location.pathname, false);

    // Handle browser back/forward - always go through server
    window.addEventListener("popstate", () => {
      this.navigateWithServer(window.location.pathname, false);
    });

    // Intercept link clicks for server navigation with smart hydration
    this.setupLinkInterception();
  }

  /**
   * Set up link click interception
   */
  private setupLinkInterception(): void {
    document.addEventListener("click", (e) => {
      const link = (e.target as Element).closest("a");
      if (link && this.shouldInterceptLink(link.href)) {
        e.preventDefault();
        this.navigateWithServer(link.pathname);
      }
    });
  }

  /**
   * Determine if a link should be intercepted for client-side navigation
   */
  private shouldInterceptLink(href: string): boolean {
    return isInternalLink(href, window.location.origin);
  }

  /**
   * Navigate to a path - always goes through server to ensure middleware execution
   */
  navigate(path: string, pushState = true): void {
    this.navigateWithServer(path, pushState);
  }

  /**
   * Navigate using server request with smart hydration
   * This ensures middleware is always executed and preserves layouts when possible
   */
  private async navigateWithServer(
    path: string,
    pushState = true
  ): Promise<void> {
    // Check if navigation should be skipped
    if (shouldSkipNavigation(this.state.currentPath, path)) {
      return;
    }

    try {
      // Make server request
      const response = await fetch(path, createNavigationFetchOptions());

      // Analyze response to determine next action
      const navigationResult = this.analyzeResponse(response);

      if (!navigationResult.success) {
        this.handleNavigationFailure(navigationResult);
        return;
      }

      // Handle redirect
      if (navigationResult.redirectTo) {
        this.navigateWithServer(navigationResult.redirectTo, pushState);
        return;
      }

      // Process successful navigation
      await this.processSuccessfulNavigation(path, pushState);
    } catch (error) {
      // Fallback to full page navigation on any error
      this.fallbackToFullPageNavigation(path);
    }
  }

  /**
   * Analyze navigation response using functional helper
   */
  private analyzeResponse(response: Response): NavigationResult {
    return analyzeNavigationResponse(response, window.location.origin);
  }

  /**
   * Handle navigation failure
   */
  private handleNavigationFailure(result: NavigationResult): void {
    if (result.shouldFallbackToFullPage) {
      if (result.redirectTo) {
        window.location.href = result.redirectTo;
      } else {
        this.fallbackToFullPageNavigation(this.state.currentPath);
      }
    }
  }

  /**
   * Process successful navigation with layout preservation
   */
  private async processSuccessfulNavigation(
    path: string,
    pushState: boolean
  ): Promise<void> {
    // Get the new route configuration
    const newRoute = getRoute(this.state, path);
    if (!newRoute) {
      // Fallback to full page navigation if route not found
      this.fallbackToFullPageNavigation(path);
      return;
    }

    // Calculate layout preservation using functional helper
    const preservedLayouts = calculatePreservedLayouts(
      this.state.currentRoute,
      newRoute
    );

    // Update router state
    this.state = updateCurrentRoute(this.state, path, newRoute);

    // Update browser history
    if (pushState) {
      window.history.pushState({}, "", path);
    }

    // Render with preserved layouts
    this.renderWithPreservation(newRoute, preservedLayouts);

    // Dispatch navigation event
    dispatchNavigationEvent(path);
  }

  /**
   * Render route with layout preservation
   */
  private renderWithPreservation(
    route: ClientRoute,
    preservedLayoutCount: number
  ): void {
    if (!this.state.renderCallback) return;

    // Create element using functional helper
    const element = createRouteElementWithPreservation(
      route,
      preservedLayoutCount
    );
    this.state.renderCallback(element);
  }

  /**
   * Fallback to full page navigation
   */
  private fallbackToFullPageNavigation(path: string): void {
    window.location.href = path;
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.state.currentPath;
  }

  /**
   * Get current route
   */
  getCurrentRoute(): ClientRoute | null {
    return this.state.currentRoute;
  }

  /**
   * Get all route paths (for debugging)
   */
  getAllPaths(): string[] {
    return Array.from(this.state.routes.keys());
  }

  /**
   * Get current state (for testing)
   */
  getState(): RouterState {
    return { ...this.state };
  }
}
