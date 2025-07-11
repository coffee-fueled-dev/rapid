/**
 * Simple server query parameter utilities
 */

import { type QueryParams, parseQueryString } from "./shared";

/**
 * Server function type that includes parsed query parameters
 */
export type ServerFunctionWithQuery = (
  req: Request,
  url: URL,
  query: QueryParams
) => Promise<Response | null> | Response | null;

/**
 * Query parameter wrapper for server functions
 *
 * @example
 * ```typescript
 * const handler = withQuery(async (req, url, query) => {
 *   const search = query.search || "";
 *   const page = parseInt(query.page || "1", 10);
 *   return Response.json({ search, page });
 * });
 * ```
 */
export function withQuery(
  handler: ServerFunctionWithQuery
): (req: Request, url: URL) => Promise<Response | null> | Response | null {
  return async (req: Request, url: URL) => {
    const query = parseQueryString(url.search);
    return await handler(req, url, query);
  };
}

/**
 * Direct query parameter extraction
 *
 * @example
 * ```typescript
 * const query = getQuery(url);
 * const search = query.search || "";
 * const page = parseInt(query.page || "1", 10);
 * ```
 */
export function getQuery(url: URL): QueryParams {
  return parseQueryString(url.search);
}
