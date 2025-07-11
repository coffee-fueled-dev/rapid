/**
 * Navigation Functions
 *
 * Pure functions for navigation logic, layout preservation, and React element creation.
 * These functions have no side effects and are easily testable.
 */

import React from "react";
import type { ClientRoute } from "@/rapid-client";

export interface NavigationRequest {
  path: string;
  pushState?: boolean;
  headers?: Record<string, string>;
}

export interface NavigationResult {
  success: boolean;
  shouldFallbackToFullPage: boolean;
  redirectTo?: string;
  error?: string;
}

/**
 * Check if a URL is an internal link
 */
export function isInternalLink(href: string, currentOrigin: string): boolean {
  try {
    return new URL(href).origin === currentOrigin;
  } catch {
    return false;
  }
}

/**
 * Create navigation headers for server requests
 */
export function createNavigationHeaders(): Record<string, string> {
  return {
    Accept: "text/html",
    "X-Requested-With": "XMLHttpRequest", // Indicate this is a navigation request
  };
}

/**
 * Analyze navigation response to determine next action
 */
export function analyzeNavigationResponse(
  response: Response,
  currentOrigin: string
): NavigationResult {
  // Handle redirects manually to ensure middleware redirects work
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (location) {
      // If it's a redirect to login or external URL, do full page navigation
      if (
        location.includes("/login") ||
        !isInternalLink(location, currentOrigin)
      ) {
        return {
          success: false,
          shouldFallbackToFullPage: true,
          redirectTo: location,
        };
      } else {
        return {
          success: true,
          shouldFallbackToFullPage: false,
          redirectTo: location,
        };
      }
    }
  }

  if (!response.ok) {
    return {
      success: false,
      shouldFallbackToFullPage: true,
      error: `Navigation failed: ${response.status}`,
    };
  }

  return {
    success: true,
    shouldFallbackToFullPage: false,
  };
}

/**
 * Calculate which layouts can be preserved between routes
 */
export function calculatePreservedLayouts(
  currentRoute: ClientRoute | null,
  newRoute: ClientRoute
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
export function createRouteElementWithPreservation(
  route: ClientRoute,
  preservedLayoutCount: number
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

/**
 * Dispatch custom navigation event
 */
export function dispatchNavigationEvent(path: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("rapid-navigation", {
        detail: { path },
      })
    );
  }
}

/**
 * Check if navigation should be skipped (same path)
 */
export function shouldSkipNavigation(
  currentPath: string,
  targetPath: string
): boolean {
  return currentPath === targetPath;
}

/**
 * Create fetch options for navigation request
 */
export function createNavigationFetchOptions(): RequestInit {
  return {
    headers: createNavigationHeaders(),
    credentials: "include", // Ensure cookies are sent for session
    redirect: "manual", // Don't follow redirects automatically - handle them manually
  };
}
