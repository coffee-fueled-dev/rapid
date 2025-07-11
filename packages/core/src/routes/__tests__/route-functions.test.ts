/**
 * Tests for Route Processing Functions
 *
 * These tests demonstrate how much easier it is to test functional modules
 * compared to the monolithic Routes class methods.
 */

import { describe, test, expect } from "bun:test";
import React from "react";
import {
  joinPaths,
  buildLayoutHierarchy,
  buildMiddlewareStack,
  normalizeMiddleware,
  createClientRoute,
  createApiRoute,
  extractServerRoutes,
  extractPaths,
  filterRoutesByPattern,
  findRouteByPath,
  groupRoutes,
  isServerEnvironment,
} from "../route-functions";
import type { SegmentEntry } from "../route-state";
import type { LayoutProps, ServerFunction } from "@/types";
import type { ClientRoute } from "@/rapid-client";

// Mock components and functions for testing
const MockComponent = () => React.createElement("div", null, "MockComponent");
const MockLayout1 = ({ children }: LayoutProps) =>
  React.createElement("div", { className: "layout1" }, children);
const MockLayout2 = ({ children }: LayoutProps) =>
  React.createElement("div", { className: "layout2" }, children);

const mockMiddleware1: ServerFunction = async () => new Response("middleware1");
const mockMiddleware2: ServerFunction = async () => new Response("middleware2");
const mockApiHandler: ServerFunction = async () => new Response("test");

describe("Route Processing Functions", () => {
  describe("joinPaths", () => {
    test("joins simple paths correctly", () => {
      expect(joinPaths("/base", "segment")).toBe("/base/segment");
    });

    test("handles empty base path", () => {
      expect(joinPaths("", "/segment")).toBe("/segment");
    });

    test("handles empty segment path", () => {
      expect(joinPaths("/base", "")).toBe("/base");
    });

    test("handles trailing slashes", () => {
      expect(joinPaths("/base/", "segment")).toBe("/base/segment");
    });

    test("handles leading slashes", () => {
      expect(joinPaths("/base", "/segment")).toBe("/base/segment");
    });

    test("handles both trailing and leading slashes", () => {
      expect(joinPaths("/base/", "/segment")).toBe("/base/segment");
    });
  });

  describe("buildLayoutHierarchy", () => {
    test("returns parent layouts when no current layout", () => {
      const parentLayouts = [MockLayout1, MockLayout2];
      const result = buildLayoutHierarchy(parentLayouts);

      expect(result).toEqual(parentLayouts);
      expect(result).not.toBe(parentLayouts); // Should be a new array
    });

    test("appends current layout to parent layouts", () => {
      const parentLayouts = [MockLayout1];
      const result = buildLayoutHierarchy(parentLayouts, MockLayout2);

      expect(result).toEqual([MockLayout1, MockLayout2]);
    });

    test("works with empty parent layouts", () => {
      const result = buildLayoutHierarchy([], MockLayout1);

      expect(result).toEqual([MockLayout1]);
    });
  });

  describe("buildMiddlewareStack", () => {
    test("returns parent middleware when no current middleware", () => {
      const parentMiddleware = [mockMiddleware1, mockMiddleware2];
      const result = buildMiddlewareStack(parentMiddleware);

      expect(result).toEqual(parentMiddleware);
      expect(result).not.toBe(parentMiddleware); // Should be a new array
    });

    test("appends current middleware to parent middleware", () => {
      const parentMiddleware = [mockMiddleware1];
      const result = buildMiddlewareStack(parentMiddleware, mockMiddleware2);

      expect(result).toEqual([mockMiddleware1, mockMiddleware2]);
    });

    test("works with empty parent middleware", () => {
      const result = buildMiddlewareStack([], mockMiddleware1);

      expect(result).toEqual([mockMiddleware1]);
    });
  });

  describe("normalizeMiddleware", () => {
    test("returns undefined for empty array", () => {
      expect(normalizeMiddleware([])).toBeUndefined();
    });

    test("returns single function for single item array", () => {
      expect(normalizeMiddleware([mockMiddleware1])).toBe(mockMiddleware1);
    });

    test("returns array for multiple items", () => {
      const middleware = [mockMiddleware1, mockMiddleware2];
      expect(normalizeMiddleware(middleware)).toEqual(middleware);
    });
  });

  describe("createClientRoute", () => {
    test("creates client route correctly", () => {
      const segmentEntry: SegmentEntry = {
        path: "/test",
        options: {
          resolver: {
            _type: "page",
            component: MockComponent,
            metadata: { title: "Test Page" },
          },
        },
      };

      const result = createClientRoute(
        segmentEntry,
        "/full/test",
        [MockLayout1],
        [mockMiddleware1]
      );

      expect(result).toEqual({
        path: "/full/test",
        component: MockComponent,
        layouts: [MockLayout1],
        metadata: { title: "Test Page" },
        middleware: mockMiddleware1,
        rateLimit: undefined,
      });
    });

    test("uses default metadata when none provided", () => {
      const segmentEntry: SegmentEntry = {
        path: "/test",
        options: {
          resolver: {
            _type: "page",
            component: MockComponent,
          },
        },
      };

      const result = createClientRoute(segmentEntry, "/test", [], []);

      expect(result.metadata).toEqual({ title: "Page /test" });
    });

    test("throws error for non-page segment", () => {
      const segmentEntry: SegmentEntry = {
        path: "/test",
        options: {
          resolver: {
            _type: "api",
            handler: mockApiHandler,
          },
        },
      };

      expect(() => {
        createClientRoute(segmentEntry, "/test", [], []);
      }).toThrow("Expected page segment, got api");
    });
  });

  describe("createApiRoute", () => {
    test("creates API route correctly", () => {
      const segmentEntry: SegmentEntry = {
        path: "/api/test",
        options: {
          resolver: {
            _type: "api",
            handler: mockApiHandler,
          },
        },
      };

      const result = createApiRoute(segmentEntry, "/full/api/test", [
        mockMiddleware1,
      ]);

      expect(result).toEqual({
        path: "/full/api/test",
        handler: mockApiHandler,
        middleware: mockMiddleware1,
        rateLimit: undefined,
      });
    });

    test("throws error for non-api segment", () => {
      const segmentEntry: SegmentEntry = {
        path: "/test",
        options: {
          resolver: {
            _type: "page",
            component: MockComponent,
          },
        },
      };

      expect(() => {
        createApiRoute(segmentEntry, "/test", []);
      }).toThrow("Expected api segment, got page");
    });
  });

  describe("extractServerRoutes", () => {
    test("extracts server routes from client routes", () => {
      const clientRoutes: ClientRoute[] = [
        {
          path: "/test",
          component: MockComponent,
          layouts: [MockLayout1],
          metadata: { title: "Test" },
          middleware: mockMiddleware1,
        },
      ];

      const result = extractServerRoutes(clientRoutes);

      expect(result).toEqual([
        {
          path: "/test",
          metadata: { title: "Test" },
          middleware: mockMiddleware1,
        },
      ]);
    });
  });

  describe("extractPaths", () => {
    test("extracts paths from routes", () => {
      const routes = [
        { path: "/home", other: "data" },
        { path: "/about", other: "data" },
      ];

      const result = extractPaths(routes);
      expect(result).toEqual(["/home", "/about"]);
    });
  });

  describe("filterRoutesByPattern", () => {
    test("filters routes by regex pattern", () => {
      const routes = [
        { path: "/api/users" },
        { path: "/api/posts" },
        { path: "/home" },
      ];

      const result = filterRoutesByPattern(routes, /^\/api\//);
      expect(result).toEqual([{ path: "/api/users" }, { path: "/api/posts" }]);
    });
  });

  describe("findRouteByPath", () => {
    test("finds route by exact path", () => {
      const routes = [
        { path: "/home", id: 1 },
        { path: "/about", id: 2 },
      ];

      const result = findRouteByPath(routes, "/about");
      expect(result).toEqual({ path: "/about", id: 2 });
    });

    test("returns undefined when route not found", () => {
      const routes = [{ path: "/home", id: 1 }];
      const result = findRouteByPath(routes, "/missing");
      expect(result).toBeUndefined();
    });
  });

  describe("groupRoutes", () => {
    test("groups routes by key function", () => {
      const routes = [
        { path: "/api/users", type: "api" },
        { path: "/api/posts", type: "api" },
        { path: "/home", type: "page" },
      ];

      const result = groupRoutes(routes, (route) => route.type);

      expect(result).toEqual({
        api: [
          { path: "/api/users", type: "api" },
          { path: "/api/posts", type: "api" },
        ],
        page: [{ path: "/home", type: "page" }],
      });
    });
  });

  describe("isServerEnvironment", () => {
    test("returns true when window is undefined", () => {
      // In Node.js test environment, window should be undefined
      expect(isServerEnvironment()).toBe(true);
    });
  });
});
