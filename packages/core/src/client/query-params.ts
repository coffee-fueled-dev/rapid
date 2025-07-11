/**
 * Client-side query parameter hooks for React components
 */

import { useState, useEffect, useCallback } from "react";
import type { QueryParams, QueryParamSchema } from "../query-params";
import {
  parseQueryString,
  parseQueryParams,
  stringifyQueryParams,
  mergeQueryParams,
  getQueryParam,
  getQueryParamArray,
} from "../query-params";

/**
 * Hook to get current query parameters
 */
export function useQueryParams(): QueryParams {
  const [params, setParams] = useState<QueryParams>(() => {
    if (typeof window === "undefined") return {};
    return parseQueryString(window.location.search);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateParams = () => {
      setParams(parseQueryString(window.location.search));
    };

    // Listen for URL changes
    window.addEventListener("popstate", updateParams);

    // Also listen for pushstate/replacestate (for programmatic navigation)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      updateParams();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args);
      updateParams();
    };

    return () => {
      window.removeEventListener("popstate", updateParams);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return params;
}

/**
 * Hook to get and set query parameters with type safety
 */
export function useTypedQueryParams<T extends Record<string, any>>(
  schema: QueryParamSchema
): [T, (updates: Partial<T>) => void] {
  const rawParams = useQueryParams();

  const typedParams = parseQueryParams<T>(
    typeof window !== "undefined" ? window.location.search : "",
    schema
  );

  const setParams = useCallback((updates: Partial<T>) => {
    if (typeof window === "undefined") return;

    const currentParams = parseQueryString(window.location.search);
    const mergedParams = mergeQueryParams(
      currentParams,
      updates as QueryParams
    );
    const newSearch = stringifyQueryParams(mergedParams);

    const newUrl = `${window.location.pathname}${
      newSearch ? `?${newSearch}` : ""
    }`;
    window.history.pushState({}, "", newUrl);
  }, []);

  return [typedParams, setParams];
}

/**
 * Hook to get a single query parameter
 */
export function useQueryParam(
  key: string,
  defaultValue?: string
): [string | undefined, (value: string | undefined) => void] {
  const params = useQueryParams();
  const value = getQueryParam(params, key, defaultValue);

  const setValue = useCallback(
    (newValue: string | undefined) => {
      if (typeof window === "undefined") return;

      const currentParams = parseQueryString(window.location.search);
      const updates: QueryParams = { [key]: newValue };
      const mergedParams = mergeQueryParams(currentParams, updates);
      const newSearch = stringifyQueryParams(mergedParams);

      const newUrl = `${window.location.pathname}${
        newSearch ? `?${newSearch}` : ""
      }`;
      window.history.pushState({}, "", newUrl);
    },
    [key]
  );

  return [value, setValue];
}

/**
 * Hook to get an array query parameter
 */
export function useQueryParamArray(
  key: string,
  defaultValue: string[] = []
): [string[], (values: string[]) => void] {
  const params = useQueryParams();
  const values = getQueryParamArray(params, key, defaultValue);

  const setValues = useCallback(
    (newValues: string[]) => {
      if (typeof window === "undefined") return;

      const currentParams = parseQueryString(window.location.search);
      const updates: QueryParams = {
        [key]: newValues.length > 0 ? newValues : undefined,
      };
      const mergedParams = mergeQueryParams(currentParams, updates);
      const newSearch = stringifyQueryParams(mergedParams);

      const newUrl = `${window.location.pathname}${
        newSearch ? `?${newSearch}` : ""
      }`;
      window.history.pushState({}, "", newUrl);
    },
    [key]
  );

  return [values, setValues];
}

/**
 * Hook for navigation with query parameters
 */
export function useQueryNavigation() {
  return useCallback((path: string, params?: QueryParams) => {
    if (typeof window === "undefined") return;

    const search = params ? stringifyQueryParams(params) : "";
    const url = `${path}${search ? `?${search}` : ""}`;
    window.history.pushState({}, "", url);
  }, []);
}
