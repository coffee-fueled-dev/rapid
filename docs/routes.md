# Routes & Pages

Routes define your application structure - both pages and API endpoints.

## Basic Route Setup

```typescript
import { Routes, page, api } from "@protologic/rapid";
import { HomePage } from "./components/home";
import { handleAPI } from "./api/handler";

export const app = new Routes()
  .segment(
    "/",
    page(HomePage, {
      title: "Home Page",
      description: "Welcome to our app",
    }),
  )
  .segment("/api/data", api(handleAPI));
```

## Page Routes

Pages render React components with server-side rendering:

```typescript
.segment("/about", page(AboutPage, {
  title: "About Us",
  description: "Learn about our company"
}))
```

**Metadata Options:**

- `title` - Page title (appears in browser tab)
- `description` - Meta description for SEO

## API Routes

API routes handle server-side requests:

```typescript
.segment("/api/users", api(handleUsers))
```

## Nested Routes

Group related routes together:

```typescript
const dashboardRoutes = new Routes()
  .segment("", page(DashboardHome))
  .segment("users", page(DashboardUsers))
  .segment("settings", page(DashboardSettings));

export const app = new Routes().segment("/dashboard", routes(dashboardRoutes));
```

## Layouts

Apply layouts to route groups:

```typescript
const dashboardRoutes = new Routes()
  .layout(DashboardLayout) // Applied to all routes in this group
  .segment("", page(DashboardHome))
  .segment("users", page(DashboardUsers));
```

## Middleware

Add middleware to routes:

```typescript
import { requireAuth } from "./middleware/auth";

const protectedRoutes = new Routes()
  .middleware(requireAuth) // Applied to all routes in this group
  .segment("profile", page(ProfilePage))
  .segment("settings", page(SettingsPage));
```

## Rate Limiting

Add rate limiting to API routes:

```typescript
.segment("/api/search", api(handleSearch, {
  windowMs: 60 * 1000,  // 1 minute window
  max: 100,             // 100 requests per window
  message: "Too many search requests"
}))
```

## Complete Example

```typescript
import { Routes, page, api, routes } from "@protologic/rapid";
import { Layout } from "./components/layout";
import { DashboardLayout } from "./components/dashboard-layout";
import { requireAuth } from "./middleware/auth";

const dashboardRoutes = new Routes()
  .middleware(requireAuth)
  .layout(DashboardLayout)
  .segment("", page(DashboardHome))
  .segment("users", page(DashboardUsers))
  .segment("settings", page(DashboardSettings));

export const app = new Routes()
  .layout(Layout)
  .segment(
    "/",
    page(HomePage, {
      title: "Home",
      description: "Welcome home",
    }),
  )
  .segment("/about", page(AboutPage))
  .segment("/dashboard", routes(dashboardRoutes))
  .segment("/api/health", api(healthCheck))
  .segment(
    "/api/search",
    api(handleSearch, {
      windowMs: 60 * 1000,
      max: 100,
    }),
  );
```
