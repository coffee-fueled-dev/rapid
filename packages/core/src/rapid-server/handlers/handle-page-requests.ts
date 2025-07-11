import type { Metadata, ServerFunction } from "@/types";
import {
  composeMiddleware,
  type ResponseModifier,
} from "../middleware/compose-middleware";
import type { RateLimitConfig } from "../middleware/rate-limiter";

/**
 * Internal server route representation (without component and layouts)
 */
export interface PageRoute {
  path: string;
  metadata: Metadata;
  middleware?: ServerFunction | ServerFunction[];
  rateLimit?: RateLimitConfig;
}

export async function handlePageRequest(
  url: URL,
  req: Request,
  pageRoute: PageRoute | undefined,
  getHTML: (path: string) => string | null
): Promise<Response> {
  let responseModifier: ResponseModifier | null = null;
  const isNavigationRequest =
    req.headers.get("X-Requested-With") === "XMLHttpRequest";

  // Execute middleware first if it exists
  if (pageRoute?.middleware) {
    let middlewareResult;

    if (Array.isArray(pageRoute.middleware)) {
      // Handle array of middleware functions
      middlewareResult = await composeMiddleware(
        pageRoute.middleware,
        req,
        url
      );
    } else {
      // Handle single middleware function
      middlewareResult = await pageRoute.middleware(req, url);
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

  let response = new Response(html, {
    headers: {
      "Content-Type": "text/html",
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
