import React from "react";
import type { PageRoute } from "../types";

export class MicroRouter {
  private routes = new Map<string, PageRoute>();
  private currentPath = "";
  private currentRoute: PageRoute | null = null;
  private renderCallback: ((element: React.ReactElement) => void) | null = null;

  configureRoutes(routes: PageRoute[]) {
    this.routes.clear();
    for (const route of routes) {
      this.routes.set(route.path, route);
    }
  }

  setRenderCallback(callback: (element: React.ReactElement) => void) {
    this.renderCallback = callback;
  }

  initialize() {
    if (typeof window === "undefined") return;

    // Handle initial route - always go through server
    this.navigateWithServer(window.location.pathname, false);

    // Handle browser back/forward - always go through server
    window.addEventListener("popstate", () => {
      this.navigateWithServer(window.location.pathname, false);
    });

    // Intercept link clicks for server navigation with smart hydration
    document.addEventListener("click", (e) => {
      const link = (e.target as Element).closest("a");
      if (link && this.isInternalLink(link.href)) {
        e.preventDefault();
        this.navigateWithServer(link.pathname);
      }
    });
  }

  /**
   * Navigate to a path - always goes through server to ensure middleware execution
   */
  navigate(path: string, pushState = true) {
    this.navigateWithServer(path, pushState);
  }

  /**
   * Navigate using server request with smart hydration
   * This ensures middleware is always executed and preserves layouts when possible
   */
  private async navigateWithServer(path: string, pushState = true) {
    if (path === this.currentPath) return;

    try {
      const response = await fetch(path, {
        headers: {
          Accept: "text/html",
          "X-Requested-With": "XMLHttpRequest", // Indicate this is a navigation request
        },
        credentials: "include", // Ensure cookies are sent for session
        redirect: "manual", // Don't follow redirects automatically - handle them manually
      });

      // Handle redirects manually to ensure middleware redirects work
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location");
        if (location) {
          // If it's a redirect to login or external URL, do full page navigation
          if (location.includes("/login") || !this.isInternalLink(location)) {
            window.location.href = location;
            return;
          } else {
            this.navigateWithServer(location, pushState);
            return;
          }
        }
      }

      if (!response.ok) {
        throw new Error(`Navigation failed: ${response.status}`);
      }
      // Get the new route configuration
      const newRoute = this.routes.get(path);
      if (!newRoute) {
        // Fallback to full page navigation
        window.location.href = path;
        return;
      }

      // Calculate which layouts can be preserved
      const preservedLayouts = this.calculatePreservedLayouts(
        this.currentRoute,
        newRoute,
      );

      // Update current state
      this.currentPath = path;
      this.currentRoute = newRoute;

      if (pushState) {
        window.history.pushState({}, "", path);
      }

      // Render with preserved layouts
      if (this.renderCallback) {
        const element = this.createRouteElementWithPreservation(
          newRoute,
          preservedLayouts,
        );
        this.renderCallback(element);
      }

      // Dispatch custom navigation event
      this.dispatchNavigationEvent(path);
    } catch (error) {
      // Fallback to full page navigation
      window.location.href = path;
    }
  }

  /**
   * Dispatch a custom navigation event for components to listen to
   */
  private dispatchNavigationEvent(path: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rapid-navigation", {
          detail: { path },
        }),
      );
    }
  }

  /**
   * Calculate which layouts can be preserved between routes
   */
  private calculatePreservedLayouts(
    currentRoute: PageRoute | null,
    newRoute: PageRoute,
  ): number {
    if (!currentRoute) return 0;

    const currentLayouts = currentRoute.layouts;
    const newLayouts = newRoute.layouts;

    let preservedCount = 0;
    const minLength = Math.min(currentLayouts.length, newLayouts.length);

    for (let i = 0; i < minLength; i++) {
      if (currentLayouts[i] === newLayouts[i]) {
        preservedCount++;
      } else {
        break;
      }
    }

    return preservedCount;
  }

  /**
   * Create route element with layout preservation
   */
  private createRouteElementWithPreservation(
    route: PageRoute,
    preservedLayoutCount: number,
  ): React.ReactElement {
    const { component: Component, layouts } = route;

    // Start with the page component
    let element = React.createElement(Component);

    // Wrap with layouts from innermost to outermost (reverse order)
    // But mark which ones should be preserved vs re-rendered
    for (let i = layouts.length - 1; i >= 0; i--) {
      const Layout = layouts[i];
      const isPreserved = i < preservedLayoutCount;

      // Add a key to help React understand which layouts to preserve
      const layoutKey = isPreserved
        ? `preserved-layout-${i}`
        : `new-layout-${i}-${Date.now()}`;

      element = React.createElement(Layout, { key: layoutKey }, element);
    }

    return element;
  }

  private isInternalLink(href: string): boolean {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  getCurrentPath(): string {
    return this.currentPath;
  }
}
