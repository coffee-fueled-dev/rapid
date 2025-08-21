/**
 * Shared query parameter types and utilities
 */

export type QueryParamValue = string | string[] | undefined;

export interface QueryParams {
  [key: string]: QueryParamValue;
}

/**
 * Parse query string into an object
 */
export function parseQueryString(search: string): QueryParams {
  const params: QueryParams = {};
  const urlParams = new URLSearchParams(search);

  for (const [key, value] of urlParams.entries()) {
    if (params[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Convert query params object back to query string
 */
export function stringifyQueryParams(params: QueryParams): string {
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      value.forEach((v) => urlParams.append(key, v));
    } else {
      urlParams.set(key, value);
    }
  }

  return urlParams.toString();
}

/**
 * Merge query parameters with existing ones
 */
export function mergeQueryParams(
  current: QueryParams,
  updates: Partial<QueryParams>
): QueryParams {
  const result = { ...current };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }

  return result;
}
