import type { ApiRoute } from "../../types";

// Security headers for API responses
function getApiSecurityHeaders(): Record<string, string> {
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

export async function handleAPIRequest(
  url: URL,
  req: Request,
  apiRoutes: ApiRoute[],
): Promise<Response | null> {
  for (const apiRoute of apiRoutes) {
    if (
      url.pathname === apiRoute.path ||
      url.pathname.startsWith(apiRoute.path + "/")
    ) {
      // Execute middleware if present
      if (apiRoute.middleware) {
        const middlewares = Array.isArray(apiRoute.middleware)
          ? apiRoute.middleware
          : [apiRoute.middleware];

        for (const middleware of middlewares) {
          const middlewareResult = await middleware(req, url);

          // If middleware returns a Response, return it immediately (auth failure, etc.)
          if (middlewareResult instanceof Response) {
            return middlewareResult;
          }

          // If middleware returns a ResponseModifier, we'd need to apply it after handler
          // For now, we'll just continue to the next middleware
        }
      }

      const handlerResult = await apiRoute.handler(req, url);

      // Ensure we only return Response objects
      if (handlerResult instanceof Response) {
        // Add security headers to API responses
        const securityHeaders = getApiSecurityHeaders();
        const headers = new Headers(handlerResult.headers);

        // Add security headers (don't override existing headers)
        Object.entries(securityHeaders).forEach(([key, value]) => {
          if (!headers.has(key)) {
            headers.set(key, value);
          }
        });

        return new Response(handlerResult.body, {
          status: handlerResult.status,
          statusText: handlerResult.statusText,
          headers,
        });
      }
    }
  }
  return null;
}
