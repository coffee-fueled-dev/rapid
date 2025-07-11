# Query Parameters

Handle URL query parameters with type safety on both client and server.

## Client-Side Hooks

### useQueryParams()

Get all current query parameters:

```typescript
import { useQueryParams } from "@protologic/rapid/client";

export function SearchPage() {
  const params = useQueryParams();

  // params = { q: "search term", page: "1", filters: ["tag1", "tag2"] }

  return <div>Query: {params.q}</div>;
}
```

### useTypedQueryParams()

Type-safe query parameters with validation:

```typescript
import { useTypedQueryParams } from "@protologic/rapid/client";
import type { QueryParamSchema } from "@protologic/rapid/client";

const searchSchema: QueryParamSchema = {
  q: { type: "string", default: "" },
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 10 },
  filters: { type: "array", default: [] },
  active: { type: "boolean", default: true }
};

interface SearchQuery {
  q: string;
  page: number;
  limit: number;
  filters: string[];
  active: boolean;
}

export function SearchPage() {
  const [query, setQuery] = useTypedQueryParams<SearchQuery>(searchSchema);

  // query is fully typed and validated
  // URL automatically syncs when setQuery is called

  const handleSearch = (searchTerm: string) => {
    setQuery({ ...query, q: searchTerm, page: 1 });
  };

  return (
    <div>
      <input
        value={query.q}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <p>Page: {query.page}</p>
      <p>Active: {query.active ? "Yes" : "No"}</p>
    </div>
  );
}
```

### useQueryParam()

Handle individual query parameters:

```typescript
import { useQueryParam } from "@protologic/rapid/client";

export function FilterComponent() {
  const [category, setCategory] = useQueryParam("category", "all");

  return (
    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
    >
      <option value="all">All Categories</option>
      <option value="tech">Technology</option>
      <option value="business">Business</option>
    </select>
  );
}
```

### useQueryParamArray()

Handle array query parameters:

```typescript
import { useQueryParamArray } from "@protologic/rapid/client";

export function TagFilter() {
  const [tags, setTags] = useQueryParamArray("tags", []);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  return (
    <div>
      {["react", "typescript", "node"].map(tag => (
        <button
          key={tag}
          onClick={() => toggleTag(tag)}
          className={tags.includes(tag) ? "active" : ""}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
```

### useQueryNavigation()

Navigate with query parameters:

```typescript
import { useQueryNavigation } from "@protologic/rapid/client";

export function NavigationExample() {
  const navigate = useQueryNavigation();

  const searchProducts = () => {
    navigate("/search", {
      q: "laptops",
      category: "electronics",
      sort: "price"
    });
  };

  return (
    <button onClick={searchProducts}>
      Search Laptops
    </button>
  );
}
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

### Type-Safe Server Query Parameters

```typescript
import { withQueryParams } from "@protologic/rapid/server/query-params";
import type { QueryParamSchema } from "@protologic/rapid";

const searchSchema: QueryParamSchema = {
  q: { type: "string", required: true },
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 10 },
  sort: { type: "string", default: "relevance" },
  filters: { type: "array", default: [] },
  includeArchived: { type: "boolean", default: false },
};

interface SearchQuery {
  q: string;
  page: number;
  limit: number;
  sort: string;
  filters: string[];
  includeArchived: boolean;
}

export const handleSearch = withQueryParams<SearchQuery>(
  searchSchema,
  async (req, url, query) => {
    // query is validated and typed
    // Returns 400 error for invalid parameters

    const results = await searchItems({
      query: query.q,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      filters: query.filters,
      includeArchived: query.includeArchived,
    });

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  },
);
```

## Schema Types

### String Parameters

```typescript
const schema: QueryParamSchema = {
  name: { type: "string", required: true },
  category: { type: "string", default: "all" },
};
```

### Number Parameters

```typescript
const schema: QueryParamSchema = {
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 10 },
  price: { type: "number", required: true },
};
```

### Boolean Parameters

```typescript
const schema: QueryParamSchema = {
  active: { type: "boolean", default: true },
  featured: { type: "boolean", default: false },
};

// URL: ?active=true&featured=false
// URL: ?active=1&featured=0  (also works)
```

### Array Parameters

```typescript
const schema: QueryParamSchema = {
  tags: { type: "array", default: [] },
  categories: { type: "array", default: ["all"] },
};

// URL: ?tags=react&tags=typescript&tags=node
// Result: { tags: ["react", "typescript", "node"] }
```

## Complete Example

Client component with server API:

**Client Component:**

```typescript
import React, { useState, useEffect } from "react";
import { useTypedQueryParams } from "@protologic/rapid/client";
import type { QueryParamSchema } from "@protologic/rapid/client";

const productSchema: QueryParamSchema = {
  search: { type: "string", default: "" },
  category: { type: "string", default: "all" },
  minPrice: { type: "number", default: 0 },
  maxPrice: { type: "number", default: 1000 },
  tags: { type: "array", default: [] },
  inStock: { type: "boolean", default: true },
  page: { type: "number", default: 1 }
};

interface ProductQuery {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  tags: string[];
  inStock: boolean;
  page: number;
}

export function ProductSearch() {
  const [query, setQuery] = useTypedQueryParams<ProductQuery>(productSchema);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const params = new URLSearchParams({
        search: query.search,
        category: query.category,
        minPrice: query.minPrice.toString(),
        maxPrice: query.maxPrice.toString(),
        inStock: query.inStock.toString(),
        page: query.page.toString()
      });

      query.tags.forEach(tag => params.append("tags", tag));

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      setProducts(data.products);
      setLoading(false);
    };

    fetchProducts();
  }, [query.search, query.category, query.minPrice, query.maxPrice, query.tags.join(','), query.inStock, query.page]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={query.search}
        onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
      />

      <select
        value={query.category}
        onChange={(e) => setQuery({ ...query, category: e.target.value, page: 1 })}
      >
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={query.inStock}
          onChange={(e) => setQuery({ ...query, inStock: e.target.checked })}
        />
        In Stock Only
      </label>

      {loading ? <div>Loading...</div> : (
        <div>
          {products.map(product => (
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
import { withQueryParams } from "@protologic/rapid/server/query-params";
import type { QueryParamSchema } from "@protologic/rapid";

const productSearchSchema: QueryParamSchema = {
  search: { type: "string", default: "" },
  category: { type: "string", default: "all" },
  minPrice: { type: "number", default: 0 },
  maxPrice: { type: "number", default: 1000 },
  tags: { type: "array", default: [] },
  inStock: { type: "boolean", default: true },
  page: { type: "number", default: 1 },
};

interface ProductSearchQuery {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  tags: string[];
  inStock: boolean;
  page: number;
}

export const handleProductSearch = withQueryParams<ProductSearchQuery>(
  productSearchSchema,
  async (req, url, query) => {
    const products = await searchProducts({
      search: query.search,
      category: query.category === "all" ? undefined : query.category,
      priceRange: [query.minPrice, query.maxPrice],
      tags: query.tags,
      inStock: query.inStock,
      page: query.page,
      limit: 20,
    });

    return new Response(
      JSON.stringify({
        products: products.data,
        total: products.total,
        page: query.page,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  },
);
```
