# Rapid Framework Security

This document outlines the security features built into the Rapid framework.

## 🛡️ Framework-Level Security Features

### 1. Path Traversal Protection

**Location:** `rapid-server/util/compile-client-bundle.ts`

- **Fixed:** Directory traversal vulnerability in `getPrebuilt()` function
- **Features:**
  - Allowlist of safe prebuilt asset paths
  - Path resolution validation
  - Automatic rejection of suspicious paths

```typescript
// Protected against: getPrebuilt("../../../etc/passwd")
const ALLOWED_PREBUILT_PATHS = [
  "client.js",
  "assets/styles.css",
  "dist/client.js",
  "dist/assets/styles.css",
];
```

### 2. CSRF Protection

**Location:** `rapid-server/middleware/csrf-protection.ts`

- **Features:**
  - Cryptographically secure token generation
  - Automatic validation for state-changing requests (POST, PUT, PATCH, DELETE)
  - Token expiry and cleanup
  - Multiple token sources (headers, cookies)
  - Timing-safe token comparison

```typescript
import {
  createCSRFProtection,
  createCSRFTokenEndpoint,
} from "@rapid/core/server";

// Add CSRF protection
const routes = new Routes()
  .middleware(createCSRFProtection())
  .segment("/api/_csrf", api(createCSRFTokenEndpoint()));
```

### 3. Input Sanitization

**Location:** `rapid-server/middleware/input-sanitization.ts`

- **Features:**
  - HTML entity encoding for XSS prevention
  - SQL injection pattern removal
  - URL validation and protocol filtering
  - File path sanitization
  - Email validation
  - Numeric input validation

```typescript
import { sanitize } from "@rapid/core/server";

// Sanitize user input
const cleanHtml = sanitize.html(userInput);
const cleanPath = sanitize.filePath(filePath);
const validEmail = sanitize.email(emailInput);
```

### 4. Security Headers

**Location:** `rapid-server/middleware/security-headers.ts`

- **Features:**
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options (clickjacking protection)
  - X-Content-Type-Options (MIME sniffing protection)
  - Referrer Policy control
  - Permissions Policy
  - Environment-specific presets

```typescript
import {
  createSecurityHeadersMiddleware,
  securityPresets,
} from "@rapid/core/server";

// Apply security headers
const routes = new Routes().middleware(
  createSecurityHeadersMiddleware(securityPresets.strict)
);
```

## 🔒 Usage Examples

### Complete Secure Setup

```typescript
import {
  RapidServer,
  createCSRFProtection,
  createSecurityHeadersMiddleware,
  securityPresets,
} from "@rapid/core/server";

const server = new RapidServer({
  enableRateLimit: true,
  maxRequestSize: 1024 * 1024, // 1MB
});

const routes = new Routes()
  // Global security middleware
  .middleware(createCSRFProtection())
  .middleware(createSecurityHeadersMiddleware(securityPresets.strict))

  // Your routes
  .segment("/", page(HomePage))
  .segment("/api/data", api(secureDataHandler));

server.configureFromRoutes(routes);
```

### Secure API Handler

```typescript
import { withQuery, sanitize } from "@rapid/core/server";

const secureApiHandler = withQuery(async (req, url, query) => {
  // Sanitize input
  const search = sanitize.input(query.search || "", { maxLength: 100 });
  const page =
    sanitize.number(query.page, { min: 1, max: 1000, integer: true }) || 1;

  // Process safely
  const results = await searchDatabase(search, page);

  return Response.json(results);
});
```

## 🎯 Security Presets

### Development

- Relaxed CSP allowing inline scripts/styles
- No HSTS
- Permissive for localhost development

```typescript
createSecurityHeadersMiddleware(securityPresets.development);
```

### Production (Strict)

- Strict CSP with no inline code
- HSTS with preload
- Restrictive permissions policy

```typescript
createSecurityHeadersMiddleware(securityPresets.strict);
```

## 🚨 Security Best Practices

### 1. Always Sanitize Input

```typescript
// ❌ Dangerous
const userTitle = query.title;
const metadata = { title: userTitle }; // XSS risk

// ✅ Safe
const userTitle = sanitize.html(query.title || "");
const metadata = { title: userTitle };
```

### 2. Use Parameterized Queries

```typescript
// ❌ Dangerous
const sql = `SELECT * FROM users WHERE name = '${userName}'`;

// ✅ Safe (pseudo-code)
const users = await db.query("SELECT * FROM users WHERE name = ?", [userName]);
```

### 3. Validate File Paths

```typescript
// ❌ Dangerous
const filePath = query.file;
const content = await Bun.file(filePath).text();

// ✅ Safe
const filePath = sanitize.filePath(query.file || "");
const safePath = path.join(UPLOADS_DIR, filePath);
```

### 4. Enable All Security Features

```typescript
const server = new RapidServer({
  enableRateLimit: true, // DoS protection
  maxRequestSize: 1024 * 1024, // Limit payload size
});

const routes = new Routes()
  .middleware(createCSRFProtection()) // CSRF protection
  .middleware(createSecurityHeadersMiddleware()) // Security headers
  .segment("/api/_csrf", api(createCSRFTokenEndpoint())); // CSRF token endpoint
```

## 🔍 Security Monitoring

### Token Cleanup

```typescript
// Run periodically to clean expired CSRF tokens
setInterval(() => {
  cleanupExpiredTokens();
}, 60 * 60 * 1000); // Every hour
```

### Security Headers Validation

The framework automatically applies security headers to all responses, but you can verify with tools like:

- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)

## 🛠️ Future Security Enhancements

Planned security improvements:

- IP-based rate limiting
- Automated security scanning
- Content validation middleware
- Session management
- OAuth/JWT integration
- Audit logging

The Rapid framework prioritizes security by default, making it easy to build secure applications without requiring security expertise from every developer.
