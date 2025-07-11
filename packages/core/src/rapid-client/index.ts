/**
 * RapidClient - Client-side application runner
 *
 * This class is responsible for:
 * 1. Hydrating the React app on the client side
 * 2. Setting up client-side routing with the MicroRouter
 * 3. Managing React root and component rendering
 * 4. Handling navigation between pages
 *
 * Usage:
 * ```typescript
 * // In your client.tsx entry point:
 * import { RapidClient } from "@protologic/rapid";
 * import { app } from "./routes";
 *
 * const client = new RapidClient();
 * client.configureFromRoutes(app);
 * ```
 */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Routes } from "@/routes";
import type { LayoutProps, Metadata, ServerFunction } from "@/types";
import { MicroRouter } from "./micro-router/micro-router";
import type { RateLimitConfig } from "@/rapid-server/middleware/rate-limiter";

/**
 * Internal page route representation (flattened from hierarchy)
 */
export interface ClientRoute {
  path: string;
  component: React.ComponentType;
  layouts: React.ComponentType<LayoutProps>[];
  metadata: Metadata;
  middleware?: ServerFunction | ServerFunction[];
  rateLimit?: RateLimitConfig;
}

export class RapidClient {
  private routes = new Map<string, ClientRoute>();
  private root: Root | null = null;
  private router = new MicroRouter();

  /**
   * Configure the client app from the same Routes instance used on the server
   * This ensures client and server route definitions stay in sync
   */
  configureFromRoutes(routes: Routes) {
    const clientRoutes = routes.getClientRoutes();
    for (const route of clientRoutes) {
      this.routes.set(route.path, route);
    }
    this.initialize();
  }

  private initialize() {
    if (typeof window === "undefined") {
      // Skip initialization on server-side
      return;
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.render());
    } else {
      this.render();
    }
  }

  private render() {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    // Create single React root
    this.root = createRoot(rootElement);

    // Configure micro router
    const clientRoutes = Array.from(this.routes.values());
    this.router.configureRoutes(clientRoutes);

    // Set render callback
    this.router.setRenderCallback((element) => {
      this.root?.render(element);
    });

    // Initialize router
    this.router.initialize();
  }

  // Public API for programmatic navigation
  navigate(path: string) {
    this.router.navigate(path);
  }

  getCurrentPath(): string {
    return this.router.getCurrentPath();
  }

  getComponent(path: string): React.ComponentType | null {
    const route = this.routes.get(path);
    return route?.component || null;
  }

  getPaths(): string[] {
    return Array.from(this.routes.keys());
  }

  getRoutes(): Map<string, ClientRoute> {
    return this.routes;
  }
}

// Keep the old export for backward compatibility
export { RapidClient as Registry };
