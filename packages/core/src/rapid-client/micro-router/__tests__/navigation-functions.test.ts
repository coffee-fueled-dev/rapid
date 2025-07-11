/**
 * Tests for Navigation Functions
 *
 * These tests demonstrate how much easier it is to test functional modules
 * compared to the monolithic MicroRouter class.
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import {
  isInternalLink,
  analyzeNavigationResponse,
  calculatePreservedLayouts,
  createRouteElementWithPreservation,
  shouldSkipNavigation,
  createNavigationHeaders,
} from "../navigation-functions";
import type { ClientRoute } from "@/rapid-client";
import type { LayoutProps } from "@/types";

// Mock React components for testing
const MockComponent1 = () => React.createElement("div", null, "Component1");
const MockComponent2 = () => React.createElement("div", null, "Component2");
const MockLayout1 = ({ children }: LayoutProps) =>
  React.createElement("div", { className: "layout1" }, children);
const MockLayout2 = ({ children }: LayoutProps) =>
  React.createElement("div", { className: "layout2" }, children);

describe("Navigation Functions", () => {
  describe("isInternalLink", () => {
    test("returns true for same origin links", () => {
      const result = isInternalLink(
        "https://example.com/page",
        "https://example.com"
      );
      expect(result).toBe(true);
    });

    test("returns false for external links", () => {
      const result = isInternalLink(
        "https://external.com/page",
        "https://example.com"
      );
      expect(result).toBe(false);
    });

    test("returns false for invalid URLs", () => {
      const result = isInternalLink("not-a-url", "https://example.com");
      expect(result).toBe(false);
    });
  });

  describe("shouldSkipNavigation", () => {
    test("returns true for same path", () => {
      const result = shouldSkipNavigation("/current", "/current");
      expect(result).toBe(true);
    });

    test("returns false for different paths", () => {
      const result = shouldSkipNavigation("/current", "/different");
      expect(result).toBe(false);
    });
  });

  describe("analyzeNavigationResponse", () => {
    test("handles successful response", () => {
      const response = new Response("OK", { status: 200 });
      const result = analyzeNavigationResponse(response, "https://example.com");

      expect(result.success).toBe(true);
      expect(result.shouldFallbackToFullPage).toBe(false);
    });

    test("handles external redirect", () => {
      const response = new Response("", {
        status: 302,
        headers: { Location: "https://external.com/login" },
      });
      const result = analyzeNavigationResponse(response, "https://example.com");

      expect(result.success).toBe(false);
      expect(result.shouldFallbackToFullPage).toBe(true);
      expect(result.redirectTo).toBe("https://external.com/login");
    });

    test("handles internal redirect", () => {
      const response = new Response("", {
        status: 302,
        headers: { Location: "https://example.com/dashboard" },
      });
      const result = analyzeNavigationResponse(response, "https://example.com");

      expect(result.success).toBe(true);
      expect(result.shouldFallbackToFullPage).toBe(false);
      expect(result.redirectTo).toBe("https://example.com/dashboard");
    });

    test("handles error response", () => {
      const response = new Response("Not Found", { status: 404 });
      const result = analyzeNavigationResponse(response, "https://example.com");

      expect(result.success).toBe(false);
      expect(result.shouldFallbackToFullPage).toBe(true);
      expect(result.error).toContain("404");
    });
  });

  describe("calculatePreservedLayouts", () => {
    test("returns 0 when no current route", () => {
      const newRoute: ClientRoute = {
        path: "/new",
        component: MockComponent1,
        layouts: [MockLayout1, MockLayout2],
        middleware: [],
        metadata: { title: "New Page" },
      };

      const result = calculatePreservedLayouts(null, newRoute);
      expect(result).toBe(0);
    });

    test("calculates preserved layouts correctly", () => {
      const currentRoute: ClientRoute = {
        path: "/current",
        component: MockComponent1,
        layouts: [MockLayout1, MockLayout2],
        middleware: [],
        metadata: { title: "Current Page" },
      };

      const newRoute: ClientRoute = {
        path: "/new",
        component: MockComponent2,
        layouts: [MockLayout1, MockLayout2],
        middleware: [],
        metadata: { title: "New Page" },
      };

      const result = calculatePreservedLayouts(currentRoute, newRoute);
      expect(result).toBe(2); // Both layouts can be preserved
    });

    test("stops at first different layout", () => {
      const currentRoute: ClientRoute = {
        path: "/current",
        component: MockComponent1,
        layouts: [MockLayout1, MockLayout2],
        middleware: [],
        metadata: { title: "Current Page" },
      };

      const newRoute: ClientRoute = {
        path: "/new",
        component: MockComponent2,
        layouts: [MockLayout2, MockLayout1], // Different order
        middleware: [],
        metadata: { title: "New Page" },
      };

      const result = calculatePreservedLayouts(currentRoute, newRoute);
      expect(result).toBe(0); // No layouts can be preserved
    });
  });

  describe("createNavigationHeaders", () => {
    test("creates correct navigation headers", () => {
      const headers = createNavigationHeaders();

      expect(headers.Accept).toBe("text/html");
      expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    });
  });

  describe("createRouteElementWithPreservation", () => {
    test("creates element with preserved layout keys", () => {
      const route: ClientRoute = {
        path: "/test",
        component: MockComponent1,
        layouts: [MockLayout1, MockLayout2],
        middleware: [],
        metadata: { title: "Test Page" },
      };

      const element = createRouteElementWithPreservation(route, 1);

      // Verify the element structure
      expect(element.type).toBe(MockLayout1);
      expect(element.key).toBe("preserved-layout-0");

      // Check nested layout
      const nestedElement = (element.props as any).children;
      expect(nestedElement.type).toBe(MockLayout2);
      expect(nestedElement.key).toContain("new-layout-1-");
    });

    test("creates element without preserved layouts", () => {
      const route: ClientRoute = {
        path: "/test",
        component: MockComponent1,
        layouts: [MockLayout1],
        middleware: [],
        metadata: { title: "Test Page" },
      };

      const element = createRouteElementWithPreservation(route, 0);

      expect(element.type).toBe(MockLayout1);
      expect(element.key).toContain("new-layout-0-");
    });
  });
});
