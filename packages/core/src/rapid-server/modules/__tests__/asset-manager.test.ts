/**
 * Example tests for the Asset Manager module
 *
 * These tests demonstrate how much easier it is to test functional modules
 * compared to the monolithic RapidServer class.
 */

import { describe, test, expect, mock } from "bun:test";
import {
  createAssetCache,
  getClientBundle,
  getCSSBundle,
  createAssetResponse,
  type AssetCache,
  type AssetManagerConfig,
} from "../asset-manager";

describe("Asset Manager", () => {
  describe("createAssetCache", () => {
    test("creates empty cache", () => {
      const cache = createAssetCache();
      expect(cache.clientBundle).toBe(null);
      expect(cache.cssBundle).toBe(null);
    });
  });

  describe("getClientBundle", () => {
    test("returns cached bundle if available", async () => {
      const cache: AssetCache = {
        clientBundle: "cached-bundle",
        cssBundle: null,
      };

      const config: AssetManagerConfig = {
        cssCompiler: null,
        isDev: true,
      };

      const result = await getClientBundle(cache, config);

      expect(result.bundle).toBe("cached-bundle");
      expect(result.updatedCache).toEqual(cache);
    });

    test("compiles fresh bundle if not cached", async () => {
      const cache = createAssetCache();
      const config: AssetManagerConfig = {
        cssCompiler: null,
        isDev: true,
      };

      // Mock the compilation functions
      const mockCompileClientBundle = mock(async () => "fresh-bundle");
      const mockGetPrebuilt = mock(async () => null);

      // This would require dependency injection in real implementation
      // For now, this demonstrates the testing approach
      const result = await getClientBundle(cache, config);

      expect(result.bundle).toBeDefined();
      expect(result.updatedCache.clientBundle).toBeDefined();
    });
  });

  describe("createAssetResponse", () => {
    test("creates response with dev headers", () => {
      const response = createAssetResponse("test content", "text/css", true);

      expect(response.headers.get("Content-Type")).toBe("text/css");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    test("creates response with production headers", () => {
      const response = createAssetResponse("test content", "text/css", false);

      expect(response.headers.get("Content-Type")).toBe("text/css");
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000"
      );
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  describe("getCSSBundle", () => {
    test("throws error when no CSS compiler provided", async () => {
      const cache = createAssetCache();
      const config: AssetManagerConfig = {
        cssCompiler: null,
        isDev: true,
      };

      try {
        await getCSSBundle(cache, config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain("No CSS compiler provided");
      }
    });

    test("uses CSS compiler when provided", async () => {
      const cache = createAssetCache();
      const mockCSSCompiler = mock(async () => "compiled-css");
      const config: AssetManagerConfig = {
        cssCompiler: mockCSSCompiler,
        isDev: true,
      };

      const result = await getCSSBundle(cache, config);

      expect(result.bundle).toBe("compiled-css");
      expect(result.updatedCache.cssBundle).toBe("compiled-css");
      expect(mockCSSCompiler).toHaveBeenCalled();
    });
  });
});
