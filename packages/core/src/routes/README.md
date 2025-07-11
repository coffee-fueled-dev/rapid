# Routes - Functional Architecture

The Routes class has been refactored to use a more functional approach while maintaining the same fluent API for route definition. This document explains the architecture and benefits.

## Architecture Overview

The functional Routes system is split into three main modules:

### 1. Route State (`route-state.ts`)

- **Purpose**: Immutable state management for route segments and configuration
- **Key Features**:
  - Pure functions for state updates
  - Immutable state transitions
  - Support for layout and middleware hierarchy
  - Easy to test and reason about

### 2. Route Functions (`route-functions.ts`)

- **Purpose**: Pure functions for route processing, path joining, and flattening
- **Key Features**:
  - No side effects
  - Easily testable in isolation
  - Composable logic
  - Clear separation of concerns

### 3. Routes v2 (`routes-v2.ts`)

- **Purpose**: Orchestrates state and route functions with fluent API
- **Key Features**:
  - Minimal stateful wrapper
  - Uses functional modules
  - Maintains same public API
  - Additional functional methods

## Key Benefits

### 1. **Immutable State Management**

State updates are predictable and traceable:

```typescript
// State is never mutated directly
const newState = addSegment(currentState, "/users", pageDescriptor);
const updatedState = setLayout(newState, AdminLayout);

// Easy to debug state changes
console.log("Before:", currentState);
console.log("After:", updatedState);
```

### 2. **Better Testability**

Each function can be tested in isolation:

```typescript
// Test path joining logic
expect(joinPaths("/base", "segment")).toBe("/base/segment");

// Test layout hierarchy building
const layouts = buildLayoutHierarchy([Layout1], Layout2);
expect(layouts).toEqual([Layout1, Layout2]);

// Test route creation
const route = createPageRoute(segmentEntry, "/full/path", layouts, middleware);
expect(route.path).toBe("/full/path");
```

### 3. **Composable Logic**

Functions can be combined and reused:

```typescript
// Route processing pipeline
const context = { basePath: "", parentLayouts: [], parentMiddleware: [] };
const layouts = buildLayoutHierarchy(context.parentLayouts, currentLayout);
const middleware = buildMiddlewareStack(
  context.parentMiddleware,
  currentMiddleware
);
const result = flattenRoutes(state, context);
```

### 4. **Enhanced Route Querying**

New functional methods for route analysis:

```typescript
// Find specific routes
const userRoute = routes.findPageRoute("/users");
const apiRoute = routes.findApiRoute("/api/users");

// Filter routes by pattern
const apiRoutes = routes.filterPageRoutes(/^\/api\//);

// Group routes by criteria
const groupedRoutes = routes.groupPageRoutes((route) =>
  route.path.startsWith("/admin") ? "admin" : "public"
);
```

## Migration Guide

The functional Routes maintains the same public API, so migration is seamless:

```typescript
// Old usage (still works)
const routes = new Routes()
  .layout(MainLayout)
  .middleware(authMiddleware)
  .segment("/users", page(UsersPage))
  .segment("/api/users", api(usersHandler));

// New capabilities
const userRoute = routes.findPageRoute("/users"); // ✨ New
const apiRoutes = routes.filterApiRoutes(/^\/api\//); // ✨ New
const grouped = routes.groupPageRoutes(groupFn); // ✨ New
const state = routes.getState(); // ✨ New (for testing)
const cloned = routes.clone(); // ✨ New
```

## Functional Route Processing

### Path Joining

Pure function for consistent path handling:

```typescript
joinPaths("/base", "segment"); // "/base/segment"
joinPaths("/base/", "/segment"); // "/base/segment"
joinPaths("", "segment"); // "segment"
```

### Layout Hierarchy

Immutable layout composition:

```typescript
const parentLayouts = [AppLayout, SectionLayout];
const currentLayout = PageLayout;
const hierarchy = buildLayoutHierarchy(parentLayouts, currentLayout);
// Result: [AppLayout, SectionLayout, PageLayout]
```

### Middleware Stack

Immutable middleware composition:

```typescript
const parentMiddleware = [authMiddleware, logMiddleware];
const currentMiddleware = validationMiddleware;
const stack = buildMiddlewareStack(parentMiddleware, currentMiddleware);
// Result: [authMiddleware, logMiddleware, validationMiddleware]
```

### Route Creation

Type-safe route creation:

```typescript
const pageRoute = createPageRoute(
  segmentEntry,
  "/full/path",
  layouts,
  middleware
);

const apiRoute = createApiRoute(segmentEntry, "/api/endpoint", middleware);
```

## Performance Considerations

### Memory Efficiency

- Immutable updates create new objects but share unchanged references
- Route maps and arrays are efficiently copied
- Functional composition reduces object creation

### Processing Speed

- Pure functions have minimal overhead
- Route flattening is optimized for hierarchical structures
- Caching opportunities for expensive operations

## Testing Strategy

### Unit Tests

Each module can be tested independently:

```typescript
// Test state functions
describe("Route State", () => {
  test("addSegment creates new state", () => {
    const state = createRouteState();
    const newState = addSegment(state, "/test", pageDescriptor);
    expect(newState).not.toBe(state); // Immutable
    expect(newState.segments.length).toBe(1);
  });
});

// Test route functions
describe("Route Functions", () => {
  test("joinPaths handles edge cases", () => {
    expect(joinPaths("/base/", "/segment")).toBe("/base/segment");
  });
});
```

### Integration Tests

The Routes class can be tested with real scenarios:

```typescript
describe("Routes Integration", () => {
  test("complex route hierarchy", () => {
    const routes = new Routes()
      .layout(MainLayout)
      .middleware(authMiddleware)
      .segment("/admin", routes(adminRoutes))
      .segment("/api", routes(apiRoutes));

    const pageRoutes = routes.getPageRoutes();
    expect(pageRoutes.length).toBeGreaterThan(0);

    const adminRoute = routes.findPageRoute("/admin/dashboard");
    expect(adminRoute?.layouts).toContain(MainLayout);
  });
});
```

## Advanced Features

### Route Analysis

New methods for route introspection:

```typescript
// Check if routes exist
if (routes.hasRoutes()) {
  console.log(`Found ${routes.getSegmentCount()} segments`);
}

// Get all routes at once
const { pageRoutes, apiRoutes } = routes.getAllRoutes();

// Clone for variations
const publicRoutes = routes
  .clone()
  .filterPageRoutes(/^\/public\//)
  .groupPageRoutes((route) => route.metadata?.category || "general");
```

### Custom Route Processing

Extend with custom functions:

```typescript
// Custom grouping
const routesByMethod = routes.groupApiRoutes((route) =>
  route.path.includes("/users") ? "users" : "other"
);

// Custom filtering
const protectedRoutes = routes.filterPageRoutes(
  (route) => route.middleware !== undefined
);
```

## Future Enhancements

The functional architecture enables several future improvements:

1. **Route Composition**: Combine route instances functionally
2. **Advanced Caching**: Memoize expensive route operations
3. **Route Validation**: Pure functions for route validation
4. **Dynamic Route Generation**: Generate routes from data sources
5. **Route Optimization**: Analyze and optimize route structures

## Conclusion

The functional Routes provides:

- ✅ Same public API (100% backward compatible)
- ✅ Immutable state management
- ✅ Better testability
- ✅ Composable logic
- ✅ Enhanced route querying
- ✅ Easier debugging
- ✅ Future-proof architecture

The functional approach makes route management more predictable, testable, and maintainable while opening up new possibilities for route analysis and optimization.
