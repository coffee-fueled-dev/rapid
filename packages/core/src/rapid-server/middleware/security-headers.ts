/**
 * Security Headers Middleware
 *
 * Provides comprehensive security headers to protect against various attacks
 * including XSS, clickjacking, MIME sniffing, and more.
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string | CSPOptions | false;
  hsts?: boolean | HSTSOptions | false;
  frameOptions?: "DENY" | "SAMEORIGIN" | "ALLOW-FROM" | false;
  contentTypeOptions?: boolean;
  referrerPolicy?:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  permissionsPolicy?: string;
  xssProtection?: boolean;
}

export interface CSPOptions {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  frameSrc?: string[];
  reportUri?: string;
  reportTo?: string;
  upgradeInsecureRequests?: boolean;
}

export interface HSTSOptions {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

const DEFAULT_CONFIG: Required<
  Omit<SecurityHeadersConfig, "contentSecurityPolicy" | "hsts">
> & {
  contentSecurityPolicy: CSPOptions;
  hsts: HSTSOptions;
} = {
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Note: unsafe-inline should be avoided in production
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: true,
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false,
  },
  frameOptions: "DENY",
  contentTypeOptions: true,
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy: "camera=(), microphone=(), geolocation=()",
  xssProtection: true,
};

/**
 * Convert CSP options to header string
 */
function buildCSPHeader(options: CSPOptions): string {
  const directives: string[] = [];

  if (options.defaultSrc) {
    directives.push(`default-src ${options.defaultSrc.join(" ")}`);
  }
  if (options.scriptSrc) {
    directives.push(`script-src ${options.scriptSrc.join(" ")}`);
  }
  if (options.styleSrc) {
    directives.push(`style-src ${options.styleSrc.join(" ")}`);
  }
  if (options.imgSrc) {
    directives.push(`img-src ${options.imgSrc.join(" ")}`);
  }
  if (options.connectSrc) {
    directives.push(`connect-src ${options.connectSrc.join(" ")}`);
  }
  if (options.fontSrc) {
    directives.push(`font-src ${options.fontSrc.join(" ")}`);
  }
  if (options.objectSrc) {
    directives.push(`object-src ${options.objectSrc.join(" ")}`);
  }
  if (options.mediaSrc) {
    directives.push(`media-src ${options.mediaSrc.join(" ")}`);
  }
  if (options.frameSrc) {
    directives.push(`frame-src ${options.frameSrc.join(" ")}`);
  }
  if (options.upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }
  if (options.reportUri) {
    directives.push(`report-uri ${options.reportUri}`);
  }
  if (options.reportTo) {
    directives.push(`report-to ${options.reportTo}`);
  }

  return directives.join("; ");
}

/**
 * Build HSTS header string
 */
function buildHSTSHeader(options: HSTSOptions): string {
  let header = `max-age=${options.maxAge}`;

  if (options.includeSubDomains) {
    header += "; includeSubDomains";
  }

  if (options.preload) {
    header += "; preload";
  }

  return header;
}

/**
 * Create security headers middleware
 */
export function createSecurityHeadersMiddleware(
  userConfig: SecurityHeadersConfig = {}
) {
  // Handle CSP configuration
  const cspConfig =
    userConfig.contentSecurityPolicy !== false &&
    userConfig.contentSecurityPolicy !== undefined
      ? typeof userConfig.contentSecurityPolicy === "object"
        ? {
            ...DEFAULT_CONFIG.contentSecurityPolicy,
            ...userConfig.contentSecurityPolicy,
          }
        : userConfig.contentSecurityPolicy
      : userConfig.contentSecurityPolicy === false
      ? false
      : DEFAULT_CONFIG.contentSecurityPolicy;

  // Handle HSTS configuration
  const hstsConfig =
    userConfig.hsts !== false && userConfig.hsts !== undefined
      ? typeof userConfig.hsts === "object"
        ? { ...DEFAULT_CONFIG.hsts, ...userConfig.hsts }
        : userConfig.hsts
      : userConfig.hsts === false
      ? false
      : DEFAULT_CONFIG.hsts;

  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    contentSecurityPolicy: cspConfig,
    hsts: hstsConfig,
  };

  return async (req: Request, url: URL) => {
    // This middleware modifies responses, so we need to return a response modifier
    return (response: Response) => {
      const headers = new Headers(response.headers);

      // Content Security Policy
      if (config.contentSecurityPolicy !== false) {
        const cspValue =
          typeof config.contentSecurityPolicy === "string"
            ? config.contentSecurityPolicy
            : buildCSPHeader(config.contentSecurityPolicy as CSPOptions);
        headers.set("Content-Security-Policy", cspValue);
      }

      // HTTP Strict Transport Security (HTTPS only)
      if (config.hsts !== false && url.protocol === "https:") {
        const hstsValue =
          typeof config.hsts === "boolean" && config.hsts
            ? buildHSTSHeader(DEFAULT_CONFIG.hsts)
            : buildHSTSHeader(config.hsts as HSTSOptions);
        headers.set("Strict-Transport-Security", hstsValue);
      }

      // X-Frame-Options
      if (config.frameOptions !== false) {
        headers.set("X-Frame-Options", config.frameOptions);
      }

      // X-Content-Type-Options
      if (config.contentTypeOptions) {
        headers.set("X-Content-Type-Options", "nosniff");
      }

      // Referrer-Policy
      headers.set("Referrer-Policy", config.referrerPolicy);

      // Permissions-Policy (formerly Feature-Policy)
      if (config.permissionsPolicy) {
        headers.set("Permissions-Policy", config.permissionsPolicy);
      }

      // X-XSS-Protection (legacy, CSP is preferred)
      if (config.xssProtection) {
        headers.set("X-XSS-Protection", "1; mode=block");
      }

      // Additional security headers
      headers.set("X-DNS-Prefetch-Control", "off");
      headers.set("X-Download-Options", "noopen");
      headers.set("X-Permitted-Cross-Domain-Policies", "none");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    };
  };
}

/**
 * Get default security headers for static assets
 */
export function getStaticAssetSecurityHeaders(): Record<string, string> {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
  };
}

/**
 * Security headers presets for different environments
 */
export const securityPresets = {
  /**
   * Strict security for production environments
   */
  strict: {
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: true,
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    frameOptions: "DENY" as const,
    contentTypeOptions: true,
    referrerPolicy: "strict-origin-when-cross-origin" as const,
    permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=()",
    xssProtection: true,
  },

  /**
   * Relaxed security for development
   */
  development: {
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "http://localhost:*",
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      upgradeInsecureRequests: false,
    },
    hsts: false,
    frameOptions: "SAMEORIGIN" as const,
    contentTypeOptions: true,
    referrerPolicy: "strict-origin-when-cross-origin" as const,
    permissionsPolicy: "",
    xssProtection: true,
  },
} as const;
