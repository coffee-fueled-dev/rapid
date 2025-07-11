# MicroRouter - Functional Architecture

The MicroRouter has been refactored to use a more functional approach while maintaining support for dynamic route management. This document explains the architecture and benefits.

## Architecture Overview

The functional MicroRouter is split into three main modules:

### 1. Router State (`router-state.ts`)

- **Purpose**: Immutable state management for routes and navigation
- **Key Features**:
  - Pure functions for state updates
  - Support for dynamic route addition/removal
  - Immutable state transitions
  - Easy to test and reason about

### 2. Navigation Functions (`navigation-functions.ts`)

- **Purpose**: Pure functions for navigation logic and layout preservation
- **Key Features**:
  - No side effects
  - Easily testable in isolation
  - Composable logic
  - Clear separation of concerns

### 3. MicroRouter v2 (`micro-router-v2.ts`)

- **Purpose**: Orchestrates state and navigation functions
- **Key Features**:
  - Minimal stateful wrapper
  - Uses functional modules
  - Maintains same public API
  - Better error handling

## Key Benefits

### 1. **Dynamic Route Management**

The functional approach makes dynamic route management much cleaner:

```typescript
// Add routes dynamically
router.addRoute({
  path: "/new-feature",
  component: NewFeatureComponent,
  layouts: [AppLayout],
  middleware: [],
  metadata: { title: "New Feature" },
});

// Remove routes
router.removeRoute("/old-feature");

// Check if route exists
if (router.hasRoute("/feature")) {
  // Route exists
}
```

### 2. **Better Testability**

Each function can be tested in isolation:

```typescript
// Test layout preservation logic
const preserved = calculatePreservedLayouts(currentRoute, newRoute);
expect(preserved).toBe(2);

// Test navigation response analysis
const result = analyzeNavigationResponse(response, origin);
expect(result.success).toBe(true);

// Test element creation
const element = createRouteElementWithPreservation(route, 1);
expect(element.key).toBe("preserved-layout-0");
```

### 3. **Immutable State**

State updates are predictable and traceable:

```typescript
// State is never mutated directly
const newState = updateRoutes(currentState, newRoutes);
const updatedState = updateCurrentRoute(newState, path, route);

// Easy to debug state changes
console.log("Before:", currentState);
console.log("After:", updatedState);
```

### 4. **Composable Logic**

Functions can be combined and reused:

```typescript
// Navigation pipeline
const response = await fetch(path, createNavigationFetchOptions());
const result = analyzeNavigationResponse(response, window.location.origin);

if (result.success && !result.redirectTo) {
  const preservedLayouts = calculatePreservedLayouts(currentRoute, newRoute);
  const element = createRouteElementWithPreservation(
    newRoute,
    preservedLayouts
  );
  renderCallback(element);
}
```

## Migration Guide

The functional MicroRouter maintains the same public API, so migration is seamless:

```typescript
// Old usage (still works)
const router = new MicroRouter();
router.configureRoutes(routes);
router.setRenderCallback(callback);
router.initialize();

// New capabilities
router.addRoute(dynamicRoute); // ✨ New
router.removeRoute("/old-path"); // ✨ New
router.hasRoute("/check"); // ✨ New
const state = router.getState(); // ✨ New (for testing)
```

## Performance Considerations

### Memory Efficiency

- Immutable updates create new objects but share unchanged references
- Route maps are efficiently copied using `new Map(existingMap)`
- Layout preservation reduces React re-renders

### Navigation Speed

- Pure functions have minimal overhead
- Navigation logic is optimized for common cases
- Smart layout preservation reduces DOM manipulation

## Testing Strategy

### Unit Tests

Each module can be tested independently:

```typescript
// Test state functions
describe("Router State", () => {
  test("updateRoutes creates new state", () => {
    const state = createRouterState();
    const newState = updateRoutes(state, routes);
    expect(newState).not.toBe(state); // Immutable
    expect(newState.routes.size).toBe(routes.length);
  });
});

// Test navigation functions
describe("Navigation Functions", () => {
  test("calculatePreservedLayouts works correctly", () => {
    const preserved = calculatePreservedLayouts(route1, route2);
    expect(preserved).toBe(expectedCount);
  });
});
```

### Integration Tests

The MicroRouter can be tested with mocked dependencies:

```typescript
describe("MicroRouter Integration", () => {
  test("dynamic route management", () => {
    const router = new MicroRouter();
    router.addRoute(testRoute);
    expect(router.hasRoute(testRoute.path)).toBe(true);

    router.removeRoute(testRoute.path);
    expect(router.hasRoute(testRoute.path)).toBe(false);
  });
});
```

## Future Enhancements

The functional architecture enables several future improvements:

1. **Route Middleware Composition**: Pure functions for middleware chains
2. **Advanced Caching**: Immutable state enables efficient memoization
3. **Time Travel Debugging**: State history tracking
4. **Hot Module Replacement**: Dynamic route updates during development
5. **Parallel Navigation**: Concurrent route loading

## Conclusion

The functional MicroRouter provides:

- ✅ Same public API (100% backward compatible)
- ✅ Dynamic route management
- ✅ Better testability
- ✅ Immutable state
- ✅ Composable logic
- ✅ Easier debugging
- ✅ Future-proof architecture

The ~20% code increase is offset by dramatically improved maintainability, testability, and the new dynamic route management capabilities that open up exciting possibilities for Rapid applications.
