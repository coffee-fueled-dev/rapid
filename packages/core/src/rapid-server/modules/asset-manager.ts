/**
 * Asset Management Module
 *
 * Functional module for managing CSS and JS asset compilation and caching.
 * Pure functions with explicit state management.
 */

import type { CSSCompiler } from "@rapid/css";
import { compileClientBundle, getPrebuilt } from "../util";

export interface AssetCache {
  clientBundle: string | null;
  cssBundle: string | null;
}

export interface AssetManagerConfig {
  cssCompiler: CSSCompiler | null;
  isDev: boolean;
}

/**
 * Create initial asset cache
 */
export function createAssetCache(): AssetCache {
  return {
    clientBundle: null,
    cssBundle: null,
  };
}

/**
 * Get client bundle (with caching)
 */
export async function getClientBundle(
  cache: AssetCache,
  config: AssetManagerConfig
): Promise<{ bundle: string; updatedCache: AssetCache }> {
  // Return cached if available
  if (cache.clientBundle) {
    return { bundle: cache.clientBundle, updatedCache: cache };
  }

  // Try prebuilt first
  const prebuilt = await getPrebuilt("client.js");
  if (prebuilt) {
    const updatedCache = { ...cache, clientBundle: prebuilt };
    return { bundle: prebuilt, updatedCache };
  }

  // Compile fresh
  const compiled = await compileClientBundle();
  const updatedCache = { ...cache, clientBundle: compiled };
  return { bundle: compiled, updatedCache };
}

/**
 * Get CSS bundle (with caching)
 */
export async function getCSSBundle(
  cache: AssetCache,
  config: AssetManagerConfig
): Promise<{ bundle: string; updatedCache: AssetCache }> {
  // Return cached if available
  if (cache.cssBundle) {
    return { bundle: cache.cssBundle, updatedCache: cache };
  }

  // Try prebuilt first
  const prebuilt = await getPrebuilt("assets/styles.css");
  if (prebuilt) {
    const updatedCache = { ...cache, cssBundle: prebuilt };
    return { bundle: prebuilt, updatedCache };
  }

  // Compile fresh
  if (!config.cssCompiler) {
    throw new Error("No CSS compiler provided to asset manager");
  }

  try {
    const compiled = await config.cssCompiler();
    const updatedCache = { ...cache, cssBundle: compiled };
    return { bundle: compiled, updatedCache };
  } catch (error) {
    console.error("❌ CSS compilation failed:", error);
    throw error;
  }
}

/**
 * Pre-compile all assets
 */
export async function precompileAssets(
  cache: AssetCache,
  config: AssetManagerConfig,
  htmlPaths: string[]
): Promise<AssetCache> {
  console.log("🔧 Pre-compiling application assets...");

  // Compile client bundle
  const { updatedCache: cacheAfterClient } = await getClientBundle(
    cache,
    config
  );

  // Compile CSS bundle
  const { updatedCache: cacheAfterCSS } = await getCSSBundle(
    cacheAfterClient,
    config
  );

  console.log("✅ Pre-compilation complete");
  return cacheAfterCSS;
}

/**
 * Create asset response with appropriate headers
 */
export function createAssetResponse(
  content: string,
  contentType: string,
  isDev: boolean
): Response {
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  return new Response(content, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": isDev ? "no-cache" : "public, max-age=31536000",
      ...securityHeaders,
      ...(isDev && {
        Pragma: "no-cache",
        Expires: "0",
      }),
    },
  });
}

/**
 * Create error response for failed asset compilation
 */
export function createAssetErrorResponse(
  contentType: string,
  fallbackContent: string = ""
): Response {
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  return new Response(fallbackContent, {
    status: 500,
    headers: {
      "Content-Type": contentType,
      ...securityHeaders,
    },
  });
}
