# Query Parameters

Handle URL query parameters with a simple, unified API on both client and server.

## Client-Side Hook

### useQueryParams()

One hook that handles all query parameter scenarios:

```typescript
import { useQueryParams } from "@protologic/rapid/client";

export function SearchPage() {
  const [params, setParams] = useQueryParams();

  // Get specific parameter with default
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  // Handle array parameters
  const tags = Array.isArray(params.tags)
    ? params.tags
    : params.tags
    ? [params.tags]
    : [];

  const handleSearch = (searchTerm: string) => {
    setParams({ search: searchTerm, page: "1" });
  };

  const toggleTag = (tag: string) => {
    const newTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    setParams({ tags: newTags });
  };

  return (
    <div>
      <input value={search} onChange={(e) => handleSearch(e.target.value)} />
      <p>Page: {page}</p>
      <p>Tags: {tags.join(", ")}</p>
    </div>
  );
}
```

### Common Patterns

**Single string parameter:**

```typescript
const [params, setParams] = useQueryParams();
const category = params.category || "all";

// Update
setParams({ category: "tech" });

// Clear
setParams({ category: undefined });
```

**Array parameter:**

```typescript
const [params, setParams] = useQueryParams();
const filters = Array.isArray(params.filters)
  ? params.filters
  : params.filters
  ? [params.filters]
  : [];

// Update
setParams({ filters: ["tag1", "tag2"] });

// Add to array
setParams({ filters: [...filters, "newTag"] });
```

**Multiple parameters:**

```typescript
const [params, setParams] = useQueryParams();

// Update multiple at once
setParams({
  search: "laptops",
  category: "electronics",
  page: "1",
});
```

## Server-Side Utilities

### Basic Query Parameter Access

```typescript
export async function handleSearch(req: Request, url: URL): Promise<Response> {
  const query = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const tags = url.searchParams.getAll("tags");

  const results = await searchItems(query, page, tags);

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### Unified Server Query Utilities

```typescript
import { withQuery, getQuery } from "@protologic/rapid/server/query-params";

// Using the wrapper function
export const handleSearch = withQuery(async (req, url, query) => {
  const search = query.search || "";
  const page = parseInt(query.page || "1", 10);
  const tags = Array.isArray(query.tags)
    ? query.tags
    : query.tags
    ? [query.tags]
    : [];

  const results = await searchItems(search, page, tags);

  return Response.json(results);
});

// Direct query extraction
export async function handleProducts(
  req: Request,
  url: URL
): Promise<Response> {
  const query = getQuery(url);
  const category = query.category || "all";
  const inStock = query.inStock === "true";

  const products = await getProducts({ category, inStock });

  return Response.json(products);
}
```

## Complete Example

**Client Component:**

```typescript
import React, { useState, useEffect } from "react";
import { useQueryParams } from "@protologic/rapid/client";

export function ProductSearch() {
  const [params, setParams] = useQueryParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Extract parameters with defaults
  const search = params.search || "";
  const category = params.category || "all";
  const inStock = params.inStock === "true";
  const page = parseInt(params.page || "1", 10);
  const tags = Array.isArray(params.tags)
    ? params.tags
    : params.tags
    ? [params.tags]
    : [];

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const searchParams = new URLSearchParams({
        search,
        category,
        inStock: inStock.toString(),
        page: page.toString(),
      });

      tags.forEach((tag) => searchParams.append("tags", tag));

      const response = await fetch(`/api/products?${searchParams}`);
      const data = await response.json();
      setProducts(data.products);
      setLoading(false);
    };

    fetchProducts();
  }, [search, category, inStock, page, tags.join(",")]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setParams({ search: e.target.value, page: "1" })}
      />

      <select
        value={category}
        onChange={(e) => setParams({ category: e.target.value, page: "1" })}
      >
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setParams({ inStock: e.target.checked.toString() })}
        />
        In Stock Only
      </label>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {products.map((product) => (
            <div key={product.id}>{product.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Server API:**

```typescript
import { withQuery } from "@protologic/rapid/server/query-params";

export const handleProductSearch = withQuery(async (req, url, query) => {
  const search = query.search || "";
  const category = query.category === "all" ? undefined : query.category;
  const inStock = query.inStock === "true";
  const page = parseInt(query.page || "1", 10);
  const tags = Array.isArray(query.tags)
    ? query.tags
    : query.tags
    ? [query.tags]
    : [];

  const products = await searchProducts({
    search,
    category,
    tags,
    inStock,
    page,
    limit: 20,
  });

  return Response.json({
    products: products.data,
    total: products.total,
    page,
  });
});
```
