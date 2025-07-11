// Security headers for production
export function getPageHeaders(isDev: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Disable potentially dangerous browser features
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  // Content Security Policy - more restrictive in production
  if (isDev) {
    headers["Content-Security-Policy"] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow eval for dev tools
      "style-src 'self' 'unsafe-inline' https://unpkg.com", // Allow GraphiQL CSS from unpkg
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' ws: wss: http://localhost:4000 https://localhost:4000", // Allow GraphQL server connections
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
  } else {
    headers["Content-Security-Policy"] = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://unpkg.com", // Allow GraphiQL CSS from unpkg
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' http://localhost:4000 https://localhost:4000", // Allow GraphQL server connections in production too
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");
  }

  return headers;
}
