import path from "path";

export async function compileClientBundle(): Promise<string> {
  try {
    const result = await Bun.build({
      entrypoints: ["src/client.tsx"],
      target: "browser",
      format: "esm",
      minify: false,
      sourcemap: "inline",
      splitting: false,
    });

    if (!result.success) {
      console.error("❌ Client bundling failed:", result.logs);
      throw new Error("Client bundling failed");
    }

    return await result.outputs[0].text();
  } catch (error) {
    console.error("❌ Failed to bundle client:", error);
    throw error;
  }
}

/**
 * Safely resolve file paths to prevent directory traversal attacks
 */
function securePath(
  requestedPath: string,
  allowedBaseDir: string = process.cwd()
): string {
  // Resolve the full path
  const resolvedPath = path.resolve(allowedBaseDir, requestedPath);
  const normalizedBase = path.resolve(allowedBaseDir);

  // Ensure the resolved path is within the allowed directory
  if (
    !resolvedPath.startsWith(normalizedBase + path.sep) &&
    resolvedPath !== normalizedBase
  ) {
    throw new Error(`Path traversal detected: ${requestedPath}`);
  }

  return resolvedPath;
}

/**
 * Allowlist of safe file paths for prebuilt assets
 */
const ALLOWED_PREBUILT_PATHS = [
  "client.js",
  "assets/styles.css",
  "dist/client.js",
  "dist/assets/styles.css",
];

export async function getPrebuilt(
  requestedPath: string
): Promise<string | null> {
  try {
    // Validate against allowlist
    if (!ALLOWED_PREBUILT_PATHS.includes(requestedPath)) {
      console.warn(`Rejected prebuilt file request: ${requestedPath}`);
      return null;
    }

    // Secure path resolution
    const safePath = securePath(requestedPath);
    const file = Bun.file(safePath);

    if (await file.exists()) {
      const bundle = await file.text();
      console.log(`✅ Using pre-built asset: ${requestedPath}`);
      return bundle;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to load prebuilt file ${requestedPath}:`, error);
    return null;
  }
}
