const activePages = new Set([
  "/community.html",
  "/disclaimer.html",
  "/documentation.html",
  "/download.html",
  "/flatzinc.html",
  "/index.html",
  "/interfaces.html",
  "/license.html",
  "/logo.html",
  "/news.html",
  "/projects.html",
  "/publications.html",
]);

export function redirectTarget(url: URL): URL | null {
  const publication = /^\/publications\/[^/]+\.html$/.test(url.pathname);
  if (!activePages.has(url.pathname) && !publication) return null;
  url.pathname = url.pathname === "/index.html" ? "/" : url.pathname.slice(0, -".html".length);
  return url;
}

export async function handleRequest(
  request: Request,
  originFetch: typeof fetch = fetch,
): Promise<Response> {
  const target = redirectTarget(new URL(request.url));
  if (target) return Response.redirect(target, 308);
  return originFetch(request);
}

export default {
  fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  },
} satisfies ExportedHandler;
