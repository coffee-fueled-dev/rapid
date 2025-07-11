import type {
  ServerRoute,
  ResponseModifier,
  ServerFunction,
} from "../../types";

/**
 * Compose multiple middleware functions into a single function
 */
async function composeMiddleware(
  middlewares: ServerFunction[],
  req: Request,
  url: URL,
): Promise<Response | ResponseModifier | null> {
  const responseModifiers: ResponseModifier[] = [];

  for (const middleware of middlewares) {
    const result = await middleware(req, url);

    // If any middleware returns a Response, return it immediately (short-circuit)
    if (result instanceof Response) {
      return result;
    }

    // If middleware returns a ResponseModifier, collect it
    if (typeof result === "function") {
      responseModifiers.push(result);
    }

    // If middleware returns null, continue to next middleware
  }

  // If we have response modifiers, compose them into a single modifier
  if (responseModifiers.length > 0) {
    return async (response: Response): Promise<Response> => {
      let currentResponse = response;
      for (const modifier of responseModifiers) {
        currentResponse = await modifier(currentResponse);
      }
      return currentResponse;
    };
  }

  return null;
}

// Security headers for production
function getSecurityHeaders(isDev: boolean = false): Record<string, string> {
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

export async function handlePageRequest(
  url: URL,
  req: Request,
  serverRoute: ServerRoute | undefined,
  getHTML: (path: string) => string | null,
): Promise<Response> {
  let responseModifier: ResponseModifier | null = null;
  const isNavigationRequest =
    req.headers.get("X-Requested-With") === "XMLHttpRequest";
  const isDev = process.env.NODE_ENV !== "production";

  // Execute middleware first if it exists
  if (serverRoute?.middleware) {
    let middlewareResult;

    if (Array.isArray(serverRoute.middleware)) {
      // Handle array of middleware functions
      middlewareResult = await composeMiddleware(
        serverRoute.middleware,
        req,
        url,
      );
    } else {
      // Handle single middleware function
      middlewareResult = await serverRoute.middleware(req, url);
    }

    // If middleware returns a complete Response, return it immediately
    // This ensures consistent behavior regardless of request type
    if (middlewareResult instanceof Response) {
      return middlewareResult;
    }

    // If middleware returns a ResponseModifier, store it for later
    if (typeof middlewareResult === "function") {
      responseModifier = middlewareResult;
    }

    // If middleware returns null, continue to serve the page
  }

  const html = getHTML(url.pathname);

  if (!html) throw new Error(`Failed to get HTML for ${url}`);

  const securityHeaders = getSecurityHeaders(isDev);

  let response = new Response(html, {
    headers: {
      "Content-Type": "text/html",
      // Add security headers
      ...securityHeaders,
      // Add a header to indicate this was a successful page render
      ...(isNavigationRequest && { "X-Navigation-Success": "true" }),
    },
  });

  // Apply response modifier if middleware provided one
  if (responseModifier) {
    response = await responseModifier(response);
  }

  return response;
}
