# API Endpoints

API endpoints handle server-side requests and return JSON responses.

## Basic API Handler

```typescript
export async function handleUsers(req: Request, url: URL): Promise<Response> {
  if (req.method === "GET") {
    const users = await getUsers();
    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
}
```

## Request Methods

Handle different HTTP methods:

```typescript
export async function handleUser(req: Request, url: URL): Promise<Response> {
  switch (req.method) {
    case "GET":
      return getUserById(url.pathname.split("/").pop());

    case "POST":
      const data = await req.json();
      return createUser(data);

    case "PUT":
      const updateData = await req.json();
      return updateUser(url.pathname.split("/").pop(), updateData);

    case "DELETE":
      return deleteUser(url.pathname.split("/").pop());

    default:
      return new Response("Method not allowed", { status: 405 });
  }
}
```

## Query Parameters

Access URL query parameters:

```typescript
export async function handleSearch(req: Request, url: URL): Promise<Response> {
  const query = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");

  const results = await searchItems(query, page, limit);

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}
```

## Type-Safe Query Parameters

Use the query parameter utilities for validation:

```typescript
import { withQueryParams } from "@protologic/rapid/server/query-params";
import type { QueryParamSchema } from "@protologic/rapid";

const searchSchema: QueryParamSchema = {
  q: { type: "string", required: true },
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 10 },
  filters: { type: "array", default: [] },
};

interface SearchQuery {
  q: string;
  page: number;
  limit: number;
  filters: string[];
}

export const handleSearch = withQueryParams<SearchQuery>(
  searchSchema,
  async (req, url, query) => {
    // query is now type-safe and validated
    const results = await searchItems(query.q, query.page, query.limit);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  },
);
```

## Request Body

Handle JSON request bodies:

```typescript
export async function handleCreateUser(
  req: Request,
  url: URL,
): Promise<Response> {
  try {
    const userData = await req.json();

    // Validate required fields
    if (!userData.name || !userData.email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const user = await createUser(userData);

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

## Error Handling

Return appropriate error responses:

```typescript
export async function handleGetUser(req: Request, url: URL): Promise<Response> {
  try {
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

## Security Headers

Add security headers to responses:

```typescript
const securityHeaders = {
  "Content-Type": "application/json",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export async function handleSecureAPI(
  req: Request,
  url: URL,
): Promise<Response> {
  const data = { message: "Secure response" };

  return new Response(JSON.stringify(data), {
    headers: securityHeaders,
  });
}
```

## Complete Example

```typescript
import { withQueryParams } from "@protologic/rapid/server/query-params";
import type { QueryParamSchema } from "@protologic/rapid";

const userSearchSchema: QueryParamSchema = {
  q: { type: "string", default: "" },
  role: { type: "string", default: "all" },
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 20 },
};

interface UserSearchQuery {
  q: string;
  role: string;
  page: number;
  limit: number;
}

export const handleUserSearch = withQueryParams<UserSearchQuery>(
  userSearchSchema,
  async (req, url, query) => {
    try {
      const users = await searchUsers({
        query: query.q,
        role: query.role === "all" ? undefined : query.role,
        page: query.page,
        limit: query.limit,
      });

      return new Response(
        JSON.stringify({
          users: users.data,
          total: users.total,
          page: query.page,
          limit: query.limit,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    } catch (error) {
      console.error("User search error:", error);
      return new Response(JSON.stringify({ error: "Search failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
);
```
