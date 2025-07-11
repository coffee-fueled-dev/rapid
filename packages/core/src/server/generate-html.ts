import type { ServerRoute } from "../types";

// HTML escape function to prevent XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// JSON escape function for script content
function escapeJson(unsafe: string): string {
  return JSON.stringify(unsafe);
}

export function generateHTML(serverRoute: ServerRoute, path: string): string {
  const title = escapeHtml(serverRoute.metadata.title);
  const description = serverRoute.metadata.description
    ? escapeHtml(serverRoute.metadata.description)
    : null;
  const safePath = escapeJson(path);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${description ? `<meta name="description" content="${description}">` : ""}
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div id="root"></div>
    <script>window.__ROUTE_PATH__ = ${safePath};</script>
    <script type="module" src="/client.js"></script>
</body>
</html>`;
}
