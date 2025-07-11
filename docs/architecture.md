# Rapid Framework Architecture

Rapid is a full-stack React framework that provides server-side rendering with client-side hydration and smart routing.

## Core Components

### **RapidServer** (Server-Side)

**Purpose**: HTTP server that handles all requests and serves the application

**Key Responsibilities**:

- Serves HTML pages with server-side rendering
- Handles API route requests
- Compiles and serves CSS bundle (`/styles.css`)
- Compiles and serves client JavaScript bundle (`/client.js`)
- Executes middleware (authentication, rate limiting, etc.)
- Manages asset compilation and caching

**Usage**:

```typescript
const server = new RapidServer({ cssCompiler });
server.configureFromRoutes(app);
await server.createServer(3000);
```

### **RapidClient** (Client-Side)

**Purpose**: Hydrates the React app and manages client-side navigation

**Key Responsibilities**:

- Hydrates server-rendered HTML to make it interactive
- Sets up client-side routing with layout preservation
- Handles link clicks and browser navigation
- Provides progressive enhancement over server-rendered pages

**Usage**: Generated automatically - included in `/client.js` bundle

### **MicroRouter** (Client-Side Navigation)

**Purpose**: Smart client-side router that preserves layouts and ensures middleware execution

**Key Features**:

- **Server-first navigation**: All navigation requests go through the server
- **Layout preservation**: Keeps shared layouts mounted during navigation
- **Progressive hydration**: Only re-renders components that changed
- **Middleware consistency**: Ensures auth checks always run
- **Graceful fallback**: Falls back to full page reload on errors

### **Routes** (Shared Configuration)

**Purpose**: Declarative route configuration used by both server and client

**Key Features**:

- Single source of truth for routes
- Supports nested routes with shared layouts
- Middleware composition
- Type-safe route definitions

## Request Flow

### Initial Page Load (Server-Side Rendering)

1. **User visits `/dashboard`**
2. **RapidServer** receives HTTP request
3. **Middleware** executes (auth, rate limiting, etc.)
4. **HTML generation** with React component tree
5. **Response** includes HTML + links to `/styles.css` and `/client.js`

### Client-Side Hydration

1. **Browser loads HTML**
2. **RapidClient** hydrates the server-rendered content
3. **MicroRouter** takes over navigation
4. **React components** become interactive

### Client-Side Navigation

1. **User clicks link** `<Link to="/profile">Profile</Link>`
2. **MicroRouter** intercepts the click
3. **Fetch request** to `/profile` (server-side)
4. **Server executes** middleware and returns HTML
5. **Client compares** layouts between old and new routes
6. **Shared layouts** are preserved (stay mounted)
7. **Changed components** re-render

## Key Benefits

### **Layout Preservation**

When navigating from `/dashboard` to `/dashboard/users`:

- `RootLayout` and `DashboardLayout` stay mounted
- Only `DashboardUsers` component re-renders
- Preserves form state, scroll position, component state

### **Middleware Consistency**

- All navigation (including client-side) goes through server middleware
- Authentication checks always run
- Rate limiting always applies
- Consistent security model

### **Progressive Enhancement**

- Works without JavaScript (server-side rendering)
- Enhanced with JavaScript (client-side routing)
- Graceful degradation on errors

### **Developer Experience**

- Single route configuration for both server and client
- No need to manually configure client-side routing
- Automatic asset compilation and serving
- Type-safe route definitions

## Example Architecture

```typescript
// routes.ts - Single source of truth
const dashboardRoutes = new Routes()
  .middleware(requireAuth) // Applied to all dashboard routes
  .layout(DashboardLayout) // Shared layout
  .segment("", page(DashboardHome))
  .segment("users", page(DashboardUsers));

export const app = new Routes()
  .layout(RootLayout) // Global layout
  .segment("/", page(HomePage))
  .segment("/dashboard", routes(dashboardRoutes))
  .segment("/api/users", api(handleUsers));

// server.ts - Server setup
const server = new RapidServer({ cssCompiler });
server.configureFromRoutes(app); // Same routes
await server.createServer(3000);

// client.ts - Generated automatically
const client = new RapidClient();
client.configureFromRoutes(app); // Same routes
```

## Navigation Example

**Route Structure**:

```
/dashboard (RootLayout + DashboardLayout + DashboardHome)
/dashboard/users (RootLayout + DashboardLayout + DashboardUsers)
```

**Navigation from `/dashboard` to `/dashboard/users`**:

1. User clicks link
2. MicroRouter makes server request
3. Server executes `requireAuth` middleware
4. Client receives response
5. Client determines:
   - `RootLayout` can be preserved ✓
   - `DashboardLayout` can be preserved ✓
   - `DashboardHome` → `DashboardUsers` (re-render)
6. Only `DashboardUsers` component re-renders

This provides the performance benefits of client-side routing while maintaining the security and consistency of server-side middleware execution.
