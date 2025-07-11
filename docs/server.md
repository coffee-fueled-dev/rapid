# Server & Client Architecture

Rapid is a full-stack React framework that provides both server-side rendering and client-side hydration with smart routing.

## Architecture Overview

### **RapidServer** (Server-Side)

- **Role**: HTTP server that handles all requests
- **Responsibilities**:
  - Serves HTML pages with server-side rendering
  - Handles API route requests
  - Compiles and serves CSS (`/styles.css`)
  - Compiles and serves client JavaScript bundle (`/client.js`)
  - Executes middleware (auth, rate limiting, etc.)
  - Manages asset compilation and caching

### **RapidClient** (Client-Side)

- **Role**: Hydrates the React app and handles client-side navigation
- **Responsibilities**:
  - Hydrates the server-rendered HTML
  - Manages client-side routing with layout preservation
  - Handles link clicks and browser navigation
  - Provides progressive enhancement over server-rendered pages

### **MicroRouter** (Client-Side Navigation)

- **Role**: Smart client-side router that preserves layouts
- **Key Features**:
  - **Server-first navigation**: All navigation goes through the server to ensure middleware execution
  - **Layout preservation**: Keeps shared layouts mounted during navigation
  - **Progressive hydration**: Only re-renders components that changed
  - **Fallback handling**: Falls back to full page reload on errors

## How It Works Together

### 1. **Initial Page Load (Server-Side)**

```typescript
// server.ts
const server = new RapidServer({ cssCompiler });
server.configureFromRoutes(app);
await server.createServer(3000);
```

When a user visits `/dashboard`:

1. RapidServer receives the request
2. Executes any middleware (auth, rate limiting)
3. Generates HTML with the React component tree
4. Returns HTML with links to `/styles.css` and `/client.js`

### 2. **Client-Side Hydration**

```typescript
// Generated automatically - included in client.js bundle
const client = new RapidClient();
client.configureFromRoutes(app); // Same routes as server
```

When the HTML loads:

1. RapidClient hydrates the server-rendered HTML
2. MicroRouter takes over navigation
3. React components become interactive

### 3. **Client-Side Navigation**

```typescript
// User clicks a link or navigates
<Link to="/profile">Profile</Link>
```

When navigating to `/profile`:

1. MicroRouter intercepts the click
2. Makes a fetch request to `/profile` (server-side)
3. Server executes middleware and returns HTML
4. Client compares layouts and preserves shared ones
5. Only re-renders the components that changed

## Basic Server Setup

```typescript
import { RapidServer } from "@protologic/rapid/server";
import { app } from "./routes";

async function main() {
  const server = new RapidServer({
    cssCompiler: () => compileUnoCSS(config), // Optional CSS compilation
    enableRateLimit: true, // Enable DoS protection
    maxRequestSize: 2 * 1024 * 1024, // 2MB max request size
  });

  server.configureFromRoutes(app);

  // Pre-compile assets for production
  if (process.env.NODE_ENV === "production") {
    await server.precompile();
  }

  await server.createServer(3000);
}

main();
```

## Route Definition (Shared)

The same Routes instance is used by both server and client:

```typescript
// routes.ts - Used by both server and client
import { Routes, page, api, routes } from "@protologic/rapid";

const dashboardRoutes = new Routes()
  .middleware(requireAuth) // Middleware applied to all routes
  .layout(DashboardLayout) // Layout applied to all routes
  .segment("", page(DashboardHome))
  .segment("users", page(DashboardUsers));

export const app = new Routes()
  .layout(RootLayout) // Global layout
  .segment("/", page(HomePage))
  .segment("/dashboard", routes(dashboardRoutes))
  .segment("/api/users", api(handleUsers));
```

## Key Benefits

### **Layout Preservation**

When navigating from `/dashboard` to `/dashboard/users`:

- `RootLayout` and `DashboardLayout` stay mounted
- Only `DashboardUsers` component re-renders
- Preserves form state, scroll position, etc.

### **Middleware Execution**

- All navigation (including client-side) goes through server middleware
- Ensures auth checks, rate limiting, etc. always work
- Provides consistent security model

### **Progressive Enhancement**

- Works without JavaScript (server-side rendering)
- Enhanced with JavaScript (client-side routing)
- Graceful fallback to full page reload on errors

## Environment Variables

```typescript
const port = parseInt(process.env.PORT || "3000");
const isDev = process.env.NODE_ENV !== "production";

const server = new RapidServer({
  enableRateLimit: !isDev, // Disable rate limiting in development
  cssCompiler: isDev ? undefined : () => compileUnoCSS(unoConfig),
});
```

## Client Bundle Generation

The server automatically generates a client bundle that includes:

- RapidClient initialization code
- All your React components
- The same route definitions as the server
- Navigation handling logic

You don't need to manually configure the client side - it's generated automatically from your server routes.

## Complete Example

```typescript
import { RapidServer } from "@protologic/rapid/server";
import { Routes, page, api } from "@protologic/rapid";
import { HomePage } from "./components/home";
import { handleAPI } from "./api/users";

// Define your routes (shared between client and server)
const app = new Routes()
  .segment("/", page(HomePage, { title: "Home" }))
  .segment("/api/users", api(handleAPI));

// Server setup
const server = new RapidServer();
server.configureFromRoutes(app);
await server.createServer(3000);
```

The client-side code is generated automatically and handles:

- Hydrating the server-rendered HTML
- Setting up client-side routing
- Preserving layouts during navigation
- Handling errors gracefully
