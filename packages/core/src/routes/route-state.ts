/**
 * Route State Management
 *
 * Functional state management for the Routes class.
 * Separates state from behavior for better testability and immutability.
 */

import type { LayoutProps, ServerFunction } from "@/types";
import type { SegmentDescriptor } from "./factories";

/**
 * Unified segment configuration options
 */
export interface SegmentOptions {
  resolver: SegmentDescriptor;
}

export interface SegmentEntry {
  path: string;
  options: SegmentOptions;
}

export interface RouteState {
  segments: SegmentEntry[];
  currentLayout?: React.ComponentType<LayoutProps>;
  currentMiddleware?: ServerFunction;
}

/**
 * Create initial route state
 */
export function createRouteState(): RouteState {
  return {
    segments: [],
    currentLayout: undefined,
    currentMiddleware: undefined,
  };
}

/**
 * Add a segment to the route state
 */
export function addSegment(
  state: RouteState,
  path: string,
  descriptor: SegmentDescriptor
): RouteState {
  const newSegment: SegmentEntry = {
    path,
    options: { resolver: descriptor },
  };

  return {
    ...state,
    segments: [...state.segments, newSegment],
  };
}

/**
 * Set layout in route state
 */
export function setLayout(
  state: RouteState,
  layoutComponent: React.ComponentType<LayoutProps>
): RouteState {
  return {
    ...state,
    currentLayout: layoutComponent,
  };
}

/**
 * Set middleware in route state
 */
export function setMiddleware(
  state: RouteState,
  middlewareFunction: ServerFunction
): RouteState {
  return {
    ...state,
    currentMiddleware: middlewareFunction,
  };
}

/**
 * Get all segments from state
 */
export function getSegments(state: RouteState): SegmentEntry[] {
  return state.segments;
}

/**
 * Get current layout from state
 */
export function getCurrentLayout(
  state: RouteState
): React.ComponentType<LayoutProps> | undefined {
  return state.currentLayout;
}

/**
 * Get current middleware from state
 */
export function getCurrentMiddleware(
  state: RouteState
): ServerFunction | undefined {
  return state.currentMiddleware;
}

/**
 * Clear all segments (useful for testing)
 */
export function clearSegments(state: RouteState): RouteState {
  return {
    ...state,
    segments: [],
  };
}

/**
 * Get segment count
 */
export function getSegmentCount(state: RouteState): number {
  return state.segments.length;
}

/**
 * Check if state has layout
 */
export function hasLayout(state: RouteState): boolean {
  return state.currentLayout !== undefined;
}

/**
 * Check if state has middleware
 */
export function hasMiddleware(state: RouteState): boolean {
  return state.currentMiddleware !== undefined;
}
