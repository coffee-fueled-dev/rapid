# Modular RapidServer Architecture

The RapidServer has been refactored into a modular, functional architecture for better testability and maintainability.

## **Before vs After**

### **Before (Monolithic)**

- Single `RapidServer` class with 300+ lines
- Mixed concerns (routing, assets, caching, middleware)
- Difficult to test individual components
- State scattered throughout the class
- Hard to reason about data flow

### **After (Modular)**

- Functional modules with clear responsibilities
- Pure functions with explicit state management
- Easy to test each module independently
- Centralized state management
- Clear data flow and dependencies

## **Module Breakdown**

### **1. Asset Manager** (`asset-manager.ts`)

**Purpose**: Handle CSS and JS compilation with caching

**Key Functions**:

- `getClientBundle(cache, config)` - Get/compile client JS bundle
- `getCSSBundle(cache, config)` - Get/compile CSS bundle
- `createAssetResponse(content, type, isDev)` - Create HTTP response with headers
- `precompileAssets(cache, config, paths)` - Pre-compile all assets

**Benefits**:

- ✅ Pure functions - easy to test
- ✅ Explicit caching behavior
- ✅ No side effects
- ✅ Mockable dependencies

```typescript
// Easy to test
const { bundle, updatedCache } = await getClientBundle(cache, config);
expect(bundle).toBeDefined();
expect(updatedCache.clientBundle).toBe(bundle);
```

### **2. Route Manager** (`route-manager.ts`)

**Purpose**: Handle route configuration and HTML generation

**Key Functions**:

- `configureRoutes(cache, routes)` - Configure from Routes instance
- `getHTML(cache, path)` - Get/generate HTML with caching
- `findApiRoute(cache, pathname)` - Find matching API route
- `precompileHTML(cache)` - Pre-generate all HTML

**Benefits**:

- ✅ Immutable state updates
- ✅ Clear separation of concerns
- ✅ Testable route matching logic
- ✅ Predictable caching behavior

```typescript
// Easy to test route matching
const route = findApiRoute(cache, "/api/users");
expect(route?.path).toBe("/api/users");
```

### **3. Request Router** (`request-router.ts`)

**Purpose**: Route HTTP requests to appropriate handlers

**Key Functions**:

- `routeRequest(context)` - Main routing logic
- `applyGlobalMiddleware(req, url, config)` - Apply middleware
- `handleCSSRequest(cache, config)` - Handle CSS requests
- `handleAPIRouteRequest(req, url, cache, config)` - Handle API requests

**Benefits**:

- ✅ Functional composition
- ✅ Explicit dependencies
- ✅ Easy to mock and test
- ✅ Clear request flow

```typescript
// Easy to test middleware application
const response = await applyGlobalMiddleware(req, url, config);
expect(response?.status).toBe(429); // Rate limited
```

### **4. RapidServer v2** (`rapid-server-v2.ts`)

**Purpose**: Orchestrate modules with minimal state

**Responsibilities**:

- Initialize module state
- Coordinate between modules
- Manage cache updates
- Provide public API

**Benefits**:

- ✅ Minimal state (just caches + configs)
- ✅ Clear separation of concerns
- ✅ Easy to reason about
- ✅ Testable public methods

## **Key Architectural Principles**

### **1. Functional Core, Imperative Shell**

- **Core logic** is pure functions (easy to test)
- **Shell** handles I/O and state management (RapidServer class)

### **2. Explicit State Management**

- State is passed explicitly to functions
- Functions return updated state
- No hidden mutations or side effects

### **3. Immutable Updates**

```typescript
// Instead of mutating
cache.clientBundle = newBundle;

// Return new state
return { ...cache, clientBundle: newBundle };
```

### **4. Dependency Injection**

```typescript
// Dependencies are explicit parameters
async function getClientBundle(
  cache: AssetCache,
  config: AssetManagerConfig
): Promise<{ bundle: string; updatedCache: AssetCache }>;
```

## **Testing Benefits**

### **Before (Hard to Test)**

```typescript
// Had to mock entire server, database, filesystem, etc.
const server = new RapidServer({ cssCompiler });
server.configureFromRoutes(mockRoutes);
const response = await server.handleRequest(mockRequest);
```

### **After (Easy to Test)**

```typescript
// Test individual functions with simple inputs
const cache = createAssetCache();
const config = { cssCompiler: mockCompiler, isDev: true };
const { bundle, updatedCache } = await getClientBundle(cache, config);

// Test routing logic in isolation
const context = {
  req,
  url,
  routeCache,
  assetCache,
  assetConfig,
  middlewareConfig,
};
const result = await routeRequest(context);
```

## **Migration Strategy**

### **Phase 1: Side-by-Side** ✅

- Keep original `RapidServer` working
- Build new modular version (`RapidServer v2`)
- Add comprehensive tests for modules

### **Phase 2: Switch Over**

- Update exports to use new version
- Run integration tests
- Monitor for regressions

### **Phase 3: Cleanup**

- Remove old implementation
- Update documentation
- Add more advanced features

## **Usage**

The public API remains the same:

```typescript
import { RapidServer } from "@protologic/rapid/server";

const server = new RapidServer({
  cssCompiler: () => compileUnoCSS(config),
});
server.configureFromRoutes(app);
await server.createServer(3000);
```

But now it's built on testable, functional modules:

```typescript
// Each module can be tested independently
import {
  getClientBundle,
  createAssetCache,
} from "@protologic/rapid/server/modules";

const cache = createAssetCache();
const result = await getClientBundle(cache, config);
```

## **Benefits Summary**

- 🧪 **Testability**: Each module is easily unit tested
- 🔧 **Maintainability**: Clear separation of concerns
- 📖 **Readability**: Smaller, focused functions
- 🐛 **Debugging**: Easier to trace issues
- 🚀 **Performance**: Same performance, better architecture
- 🔒 **Reliability**: Pure functions are more predictable
