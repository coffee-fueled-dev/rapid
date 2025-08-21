/**
 * Unified client-side query parameter hook
 */

import { useState, useEffect, useCallback } from "react";
import {
  type QueryParams,
  parseQueryString,
  stringifyQueryParams,
  mergeQueryParams,
} from "./shared";

/**
 *
 * @example
 * ```typescript
 * // Get all parameters
 * const [params, setParams] = useQueryParams();
 *
 * // Get specific parameter with default
 * const search = params.search || "";
 *
 * // Get array parameter
 * const tags = Array.isArray(params.tags) ? params.tags : params.tags ? [params.tags] : [];
 *
 * // Update parameters
 * setParams({ search: "new value", page: "1" });
 *
 * // Clear a parameter
 * setParams({ search: undefined });
 * ```
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
