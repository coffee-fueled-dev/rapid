/**
 * Simple client-side query parameter utilities
 */

import { useState, useEffect, useCallback } from "react";
import {
  type QueryParams,
  parseQueryString,
  stringifyQueryParams,
  mergeQueryParams,
  getQueryParam,
  getQueryParamArray,
} from "./shared";

/**
 * Hook to get current query parameters
 */
export function useQueryParams(): [
  QueryParams,
  (updates: Partial<QueryParams>) => void
] {
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

  const setQueryParams = useCallback((updates: Partial<QueryParams>) => {
    if (typeof window === "undefined") return;

    const currentParams = parseQueryString(window.location.search);
    const mergedParams = mergeQueryParams(currentParams, updates);
    const newSearch = stringifyQueryParams(mergedParams);

    const newUrl = `${window.location.pathname}${
      newSearch ? `?${newSearch}` : ""
    }`;
    window.history.pushState({}, "", newUrl);
  }, []);

  return [params, setQueryParams];
}

/**
 * Hook to get a single query parameter
 */
export function useQueryParam(
  key: string,
  defaultValue?: string
): [string | undefined, (value: string | undefined) => void] {
  const [params, setParams] = useQueryParams();
  const value = getQueryParam(params, key, defaultValue);

  const setValue = useCallback(
    (newValue: string | undefined) => {
      setParams({ [key]: newValue });
    },
    [key, setParams]
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
  const [params, setParams] = useQueryParams();
  const values = getQueryParamArray(params, key, defaultValue);

  const setValues = useCallback(
    (newValues: string[]) => {
      setParams({ [key]: newValues.length > 0 ? newValues : undefined });
    },
    [key, setParams]
  );

  return [values, setValues];
}
