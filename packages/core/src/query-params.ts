/**
 * Shared query parameter types and utilities
 */

export type QueryParamValue = string | string[] | undefined;

export interface QueryParams {
  [key: string]: QueryParamValue;
}

export interface QueryParamSchema {
  [key: string]: {
    type: "string" | "number" | "boolean" | "array";
    required?: boolean;
    default?: any;
  };
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
 * Parse and validate query parameters against a schema
 */
export function parseQueryParams<T extends Record<string, any>>(
  search: string,
  schema: QueryParamSchema
): T {
  const rawParams = parseQueryString(search);
  const result: any = {};

  for (const [key, config] of Object.entries(schema)) {
    const rawValue = rawParams[key];

    if (rawValue === undefined) {
      if (config.required) {
        throw new Error(`Required query parameter '${key}' is missing`);
      }
      result[key] = config.default;
      continue;
    }

    try {
      switch (config.type) {
        case "string":
          result[key] = Array.isArray(rawValue) ? rawValue[0] : rawValue;
          break;

        case "number":
          const numValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
          result[key] = parseFloat(numValue);
          if (isNaN(result[key])) {
            throw new Error(`Invalid number value for '${key}': ${numValue}`);
          }
          break;

        case "boolean":
          const boolValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
          result[key] = boolValue === "true" || boolValue === "1";
          break;

        case "array":
          result[key] = Array.isArray(rawValue) ? rawValue : [rawValue];
          break;

        default:
          result[key] = rawValue;
      }
    } catch (error) {
      throw new Error(
        `Error parsing query parameter '${key}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return result as T;
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

/**
 * Get a single query parameter value
 */
export function getQueryParam(
  params: QueryParams,
  key: string,
  defaultValue?: string
): string | undefined {
  const value = params[key];
  if (value === undefined) return defaultValue;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Get an array query parameter value
 */
export function getQueryParamArray(
  params: QueryParams,
  key: string,
  defaultValue: string[] = []
): string[] {
  const value = params[key];
  if (value === undefined) return defaultValue;
  return Array.isArray(value) ? value : [value];
}
