// Security headers for static assets
function getStaticAssetSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

export async function handleClientBundleRequest(
  getClientBundle: () => Promise<string>,
): Promise<Response> {
  try {
    const bundle = await getClientBundle();
    const isDev = process.env.NODE_ENV !== "production";
    const securityHeaders = getStaticAssetSecurityHeaders();

    return new Response(bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": isDev
          ? "no-cache, no-store, must-revalidate"
          : "public, max-age=31536000",
        "Last-Modified": new Date().toUTCString(),
        ...securityHeaders,
        ...(isDev && {
          Pragma: "no-cache",
          Expires: "0",
        }),
      },
    });
  } catch (error) {
    console.error("❌ Client bundle failed:", error);
    const securityHeaders = getStaticAssetSecurityHeaders();

    return new Response("// Client bundling error", {
      status: 500,
      headers: {
        "Content-Type": "application/javascript",
        ...securityHeaders,
      },
    });
  }
}
