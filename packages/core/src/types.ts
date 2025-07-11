import React from "react";
import type { MiddlewareResult } from "./rapid-server/middleware/compose-middleware";

export interface Metadata {
  title: string;
  description?: string;
}

export type ServerFunction = (
  req: Request,
  url: URL
) => Promise<MiddlewareResult> | MiddlewareResult;

/**
 * Layout component props (compatible with hierarchical routing)
 */
export interface LayoutProps {
  children?: React.ReactNode;
}
