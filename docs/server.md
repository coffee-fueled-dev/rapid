# Server Setup

Configure and run your Rapid application server.

## Basic Server Setup

```typescript
import { ServerRegistry } from "@protologic/rapid/server";
import { app } from "./routes";

async function main() {
  const serverRegistry = new ServerRegistry();
  serverRegistry.configureFromRoutes(app);

  await serverRegistry.createServer(3000);
}

main();
```

## Server Configuration Options

```typescript
const serverRegistry = new ServerRegistry({
  enableRateLimit: true, // Enable DoS protection
  maxRequestSize: 2 * 1024 * 1024, // 2MB max request size
  cssCompiler: () => compileCSS(), // CSS compilation function
});
```

## CSS Compilation

### With UnoCSS

```typescript
import { ServerRegistry, compileUnoCSS } from "@protologic/rapid/server";
import unoConfig from "./uno.config";

const cssCompiler = () => compileUnoCSS(unoConfig);

const serverRegistry = new ServerRegistry({
  cssCompiler,
});
```

### Custom CSS Compiler

```typescript
async function customCSSCompiler(): Promise<string> {
  // Your custom CSS compilation logic
  const css = await compileSass("./styles/main.scss");
  return css;
}

const serverRegistry = new ServerRegistry({
  cssCompiler: customCSSCompiler,
});
```

## Production Builds

Pre-compile assets for production:

```typescript
async function main() {
  const serverRegistry = new ServerRegistry({
    cssCompiler: () => compileUnoCSS(unoConfig),
  });

  serverRegistry.configureFromRoutes(app);

  // Pre-compile for production
  if (process.env.NODE_ENV === "production") {
    await serverRegistry.precompile();
  }

  await serverRegistry.createServer(3000);
}
```

## Environment Variables

```typescript
const port = parseInt(process.env.PORT || "3000");
const isDev = process.env.NODE_ENV !== "production";

const serverRegistry = new ServerRegistry({
  enableRateLimit: !isDev, // Disable rate limiting in development
  cssCompiler: isDev ? undefined : () => compileUnoCSS(unoConfig),
});

await serverRegistry.createServer(port);
```

## Error Handling

```typescript
async function main() {
  try {
    const serverRegistry = new ServerRegistry();
    serverRegistry.configureFromRoutes(app);

    await serverRegistry.createServer(3000);
    console.log("✅ Server started on http://localhost:3000");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main();
```

## Docker Setup

**Dockerfile:**

```dockerfile
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Pre-compile assets
RUN bun run build

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "run", "src/server.ts"]
```

**Build script in package.json:**

```json
{
  "scripts": {
    "build": "NODE_ENV=production bun run src/precompile.ts",
    "start": "NODE_ENV=production bun run src/server.ts",
    "dev": "bun run src/server.ts"
  }
}
```

## Complete Example

```typescript
import { ServerRegistry, compileUnoCSS } from "@protologic/rapid/server";
import { app } from "./routes";
import unoConfig from "./uno.config";

async function main() {
  try {
    // Configure CSS compilation
    const cssCompiler = () => compileUnoCSS(unoConfig);

    // Create server registry
    const serverRegistry = new ServerRegistry({
      cssCompiler,
      enableRateLimit: process.env.NODE_ENV === "production",
      maxRequestSize: 5 * 1024 * 1024, // 5MB for file uploads
    });

    // Configure routes
    serverRegistry.configureFromRoutes(app);

    // Pre-compile for production
    if (process.env.NODE_ENV === "production") {
      console.log("🔧 Pre-compiling assets...");
      await serverRegistry.precompile();
      console.log("✅ Assets pre-compiled");
    }

    // Start server
    const port = parseInt(process.env.PORT || "3000");
    await serverRegistry.createServer(port);

    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down server...");
  process.exit(0);
});

main();
```
