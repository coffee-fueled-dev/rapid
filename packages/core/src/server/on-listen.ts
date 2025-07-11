import type { ServerRoute, ApiRoute } from "../types";

export function onListen({
  port,
  serverRoutes,
  apiRoutes,
}: {
  port: number;
  serverRoutes: Map<string, ServerRoute>;
  apiRoutes: ApiRoute[];
}) {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log("📁 Routes:");

  // Log page routes
  for (const path of serverRoutes.keys()) {
    console.log(`  ${path} - Page route`);
  }

  // Log API routes
  for (const route of apiRoutes) {
    console.log(`  ${route.path} - API route`);
  }

  console.log(`💡 Open http://localhost:${port} in your browser`);
}
