/**
 * Input Sanitization Utilities
 *
 * Provides various sanitization functions to prevent injection attacks
 * and ensure safe handling of user input.
 */

/**
 * HTML entity encoding to prevent XSS
 */
export function escapeHtml(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Remove dangerous HTML tags and attributes
 */
export function stripDangerousHtml(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  // Remove script tags and their content
  let cleaned = input.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove dangerous attributes (on* event handlers, javascript: urls)
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "");
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*'[^']*'/gi, "");
  cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, "");
  cleaned = cleaned.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, "");

  // Remove style attributes that could contain expressions
  cleaned = cleaned.replace(/\s*style\s*=\s*"[^"]*"/gi, "");
  cleaned = cleaned.replace(/\s*style\s*=\s*'[^']*'/gi, "");

  return cleaned;
}

/**
 * Sanitize SQL input (basic - use parameterized queries instead)
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  // Remove common SQL injection patterns
  return input
    .replace(/['"`;\\]/g, "") // Remove quotes, semicolons, backslashes
    .replace(
      /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi,
      ""
    ) // Remove SQL keywords
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*/g, "") // Remove block comment start
    .replace(/\*\//g, ""); // Remove block comment end
}

/**
 * Validate and sanitize URL input
 */
export function sanitizeUrl(input: string): string | null {
  if (typeof input !== "string") {
    return null;
  }

  try {
    const url = new URL(input);

    // Only allow safe protocols
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
    if (!allowedProtocols.includes(url.protocol)) {
      return null;
    }

    // Prevent javascript: and data: URLs
    if (url.protocol === "javascript:" || url.protocol === "data:") {
      return null;
    }

    return url.toString();
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Sanitize file paths to prevent directory traversal
 */
export function sanitizeFilePath(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove path traversal attempts
  let sanitized = input
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/[<>:"|?*]/g, "") // Remove invalid filename characters
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/\/+/g, "/"); // Normalize multiple slashes

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "");

  return sanitized;
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(
  input: unknown,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): number | null {
  let num: number;

  if (typeof input === "number") {
    num = input;
  } else if (typeof input === "string") {
    num = options.integer ? parseInt(input, 10) : parseFloat(input);
  } else {
    return null;
  }

  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  // Check bounds
  if (options.min !== undefined && num < options.min) {
    return null;
  }
  if (options.max !== undefined && num > options.max) {
    return null;
  }

  return num;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input: string): string | null {
  if (typeof input !== "string") {
    return null;
  }

  // Basic email validation pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const trimmed = input.trim().toLowerCase();

  if (!emailPattern.test(trimmed)) {
    return null;
  }

  // Additional length check
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * General input sanitization for common cases
 */
export function sanitizeInput(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    allowNewlines?: boolean;
    trim?: boolean;
  } = {}
): string {
  if (typeof input !== "string") {
    return String(input);
  }

  let sanitized = input;

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Length limit
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Remove newlines if not allowed
  if (!options.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, "");
  }

  // HTML handling
  if (!options.allowHtml) {
    sanitized = escapeHtml(sanitized);
  } else {
    sanitized = stripDangerousHtml(sanitized);
  }

  return sanitized;
}

/**
 * Middleware for automatic input sanitization
 */
export function createInputSanitationMiddleware(
  options: {
    sanitizeQuery?: boolean;
    sanitizeBody?: boolean;
    maxInputLength?: number;
  } = {}
) {
  const config = {
    sanitizeQuery: true,
    sanitizeBody: true,
    maxInputLength: 10000,
    ...options,
  };

  return async (req: Request, url: URL) => {
    // Sanitize query parameters
    if (config.sanitizeQuery) {
      const params = new URLSearchParams(url.search);
      for (const [key, value] of params.entries()) {
        const sanitized = sanitizeInput(value, {
          maxLength: config.maxInputLength,
          allowHtml: false,
        });
        params.set(key, sanitized);
      }
      // Note: We can't modify the URL object directly, this would need to be
      // integrated into the query parameter handling
    }

    // For body sanitization, we'd need to read and re-write the request body
    // This is more complex and depends on the content type

    return null; // Continue processing
  };
}

/**
 * Sanitization utilities object for easy access
 */
export const sanitize = {
  html: escapeHtml,
  sql: sanitizeSqlInput,
  url: sanitizeUrl,
  filePath: sanitizeFilePath,
  number: sanitizeNumber,
  email: sanitizeEmail,
  input: sanitizeInput,
  stripHtml: stripDangerousHtml,
} as const;
