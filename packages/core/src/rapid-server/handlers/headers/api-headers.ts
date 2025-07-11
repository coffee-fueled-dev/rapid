// Security headers for API responses
export function getApiSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Disable caching of sensitive API responses
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  };
}
