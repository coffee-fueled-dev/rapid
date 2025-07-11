/**
 * Server-side query parameter utilities
 */

import type { QueryParams, QueryParamSchema } from "../query-params";
import { parseQueryString, parseQueryParams } from "../query-params";

/**
 * Enhanced server function type that includes parsed query parameters
 */
export type ServerFunctionWithQuery<T = QueryParams> = (
  req: Request,
  url: URL,
  query: T
) => Promise<Response | null> | Response | null;

/**
 * Extract query parameters from a URL object
 */
export function getQueryParams(url: URL): QueryParams {
  return parseQueryString(url.search);
}

/**
 * Extract and validate query parameters from a URL using a schema
 */
export function getTypedQueryParams<T extends Record<string, any>>(
  url: URL,
  schema: QueryParamSchema
): T {
  return parseQueryParams<T>(url.search, schema);
}

/**
 * Create a server function wrapper that automatically parses query parameters
 */
export function withQueryParams<T extends Record<string, any>>(
  schema: QueryParamSchema,
  handler: ServerFunctionWithQuery<T>
): (req: Request, url: URL) => Promise<Response | null> | Response | null {
  return async (req: Request, url: URL) => {
    try {
      const query = getTypedQueryParams<T>(url, schema);
      return await handler(req, url, query);
    } catch (error) {
      // Return 400 Bad Request for invalid query parameters
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message:
            error instanceof Error ? error.message : "Invalid query parameters",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        }
      );
    }
  };
}

/**
 * Simple wrapper for untyped query parameters
 */
export function withQuery(
  handler: ServerFunctionWithQuery<QueryParams>
): (req: Request, url: URL) => Promise<Response | null> | Response | null {
  return async (req: Request, url: URL) => {
    const query = getQueryParams(url);
    return await handler(req, url, query);
  };
}
