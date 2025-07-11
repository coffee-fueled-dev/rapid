import type { ServerFunction } from "@/types";
import type { RateLimitConfig } from "../middleware/rate-limiter";

/**
 * Internal API route representation (with path added)
 */
export interface ApiRoute {
  path: string;
  handler: ServerFunction;
  middleware?: ServerFunction | ServerFunction[];
  rateLimit?: RateLimitConfig;
}

export async function handleAPIRequest(
  url: URL,
  req: Request,
  apiRoutes: ApiRoute[]
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
        // Return the response as-is - security headers will be applied by middleware
        return handlerResult;
      }
    }
  }
  return null;
}
