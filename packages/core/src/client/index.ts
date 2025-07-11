import React from "react";
import { createRoot } from "react-dom/client";
import type { Routes } from "../routes";
import type { PageRoute } from "../types";
import { MicroRouter } from "./micro-router";

export class Registry {
  private routes = new Map<string, PageRoute>();
  private root: any = null;
  private router = new MicroRouter();

  configureFromRoutes(routes: Routes) {
    const pageRoutes = routes.getPageRoutes();
    for (const route of pageRoutes) {
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
    const pageRoutes = Array.from(this.routes.values());
    this.router.configureRoutes(pageRoutes);

    // Set render callback
    this.router.setRenderCallback((element) => {
      this.root.render(element);
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

  getRoutes(): Map<string, PageRoute> {
    return this.routes;
  }
}

// Export client-side query parameter hooks and types
export type {
  QueryParams,
  QueryParamSchema,
  QueryParamValue,
} from "./query-params";
export {
  useQueryParams,
  useTypedQueryParams,
  useQueryParam,
  useQueryParamArray,
  useQueryNavigation,
} from "./query-params";
