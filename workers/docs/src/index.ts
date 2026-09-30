import robots from "../../../robots.txt";

export interface Env {
  DOCS: R2Bucket;
  LATEST_DOC_VERSION: string;
  DOC_REVISIONS?: string;
}

type ResolvedPath = {
  key: string;
  version: string;
  relative: string;
  revision?: string;
  isAlias: boolean;
  isRevision: boolean;
};

const versionPattern = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
const revisionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function configuredRevisions(value: string | undefined): Record<string, string> {
  if (value === undefined) return {};
  const revisions: unknown = JSON.parse(value);
  if (!revisions || typeof revisions !== "object" || Array.isArray(revisions)) {
    throw new Error("DOC_REVISIONS must be a JSON object mapping versions to revisions");
  }
  for (const [version, revision] of Object.entries(revisions)) {
    if (!versionPattern.test(version) || typeof revision !== "string" || !revisionPattern.test(revision)) {
      throw new Error(`Invalid DOC_REVISIONS entry for ${version}`);
    }
  }
  return revisions as Record<string, string>;
}

const securityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

const documentationEdgeCache = "public, max-age=2592000, stale-while-revalidate=604800, stale-if-error=2592000";
const sitemapEdgeCache = "public, max-age=86400, stale-while-revalidate=86400, stale-if-error=2592000";

function errorResponse(status: number, message: string, extraHeaders: HeadersInit = {}): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${status} ${message}</title><body><h1>${status}</h1><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": status === 404 ? "public, max-age=300" : "no-store",
        ...securityHeaders,
        ...extraHeaders,
      },
    },
  );
}

function safeDecodePath(pathname: string): string | null {
  try {
    if (/%(?:00|2f|5c)/i.test(pathname)) return null;
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes("\\") || decoded.includes("//") || decoded.includes("\0")) return null;
    const segments = decoded.split("/");
    if (segments.some((segment) => segment === "." || segment === "..")) return null;
    if (/%(?:2e|2f|5c)/i.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function resolvePath(pathname: string, latestVersion: string): ResolvedPath | null {
  const decoded = safeDecodePath(pathname);
  if (!decoded) return null;

  let relative: string;
  let version: string;
  let isAlias = false;

  if (decoded === "/doc/sitemap.xml") {
    relative = "sitemap.xml";
    version = latestVersion;
    isAlias = true;
  } else if (decoded === "/doc-latest" || decoded.startsWith("/doc-latest/")) {
    relative = decoded.slice("/doc-latest".length).replace(/^\//, "");
    version = latestVersion;
    isAlias = true;
  } else if (decoded === "/doc/latest" || decoded.startsWith("/doc/latest/")) {
    relative = decoded.slice("/doc/latest".length).replace(/^\//, "");
    version = latestVersion;
    isAlias = true;
  } else {
    const match = decoded.match(/^\/doc\/([^/]+)(?:\/(.*))?$/);
    if (!match) return null;
    version = match[1];
    relative = match[2] ?? "";
    if (!versionPattern.test(version)) return null;
  }

  if (!versionPattern.test(version)) return null;
  let revision: string | undefined;
  if (relative === "revisions" || relative.startsWith("revisions/")) {
    const match = relative.match(/^revisions\/([^/]+)(?:\/(.*))?$/);
    if (isAlias || !match || !revisionPattern.test(match[1])) return null;
    revision = match[1];
    relative = match[2] ?? "";
  }
  if (relative === "" || relative.endsWith("/")) relative += "index.html";
  return { key: `${version}/${relative}`, version, relative, revision, isAlias, isRevision: revision !== undefined };
}

function parseRange(value: string, size: number): { offset: number; length: number } | "invalid" {
  const match = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return "invalid";

  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return "invalid";
    const length = Math.min(suffix, size);
    return { offset: size - length, length };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= size || requestedEnd < start) {
    return "invalid";
  }
  const end = Math.min(requestedEnd, size - 1);
  return { offset: start, length: end - start + 1 };
}

function applyObjectHeaders(headers: Headers, object: R2Object, resolved: ResolvedPath): void {
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Last-Modified", object.uploaded.toUTCString());
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Gecode-Documentation-Version", resolved.version);
  headers.set("X-Gecode-Documentation-Revision", resolved.revision ?? "legacy");
  headers.set(
    "Cache-Control",
    resolved.isRevision
      ? "public, max-age=31536000, immutable"
      : "public, max-age=300",
  );
  headers.set("Cloudflare-CDN-Cache-Control", resolved.isRevision
    ? "public, max-age=31536000, stale-while-revalidate=604800, stale-if-error=2592000"
    : /^sitemap(?:-\d+)?\.xml$/.test(resolved.relative) ? sitemapEdgeCache : documentationEdgeCache);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
}

function applyIndexingPolicy(request: Request, response: Response, env: Env): Response {
  const url = new URL(request.url);
  const decoded = safeDecodePath(url.pathname);
  const resolved = resolvePath(url.pathname, env.LATEST_DOC_VERSION);
  const indexable = url.origin === "https://www.gecode.dev"
    && decoded?.startsWith("/doc/latest/")
    && resolved !== null
    && !resolved.isRevision
    && [200, 206, 304].includes(response.status);
  const headers = new Headers(response.headers);
  // Workers Cache stores the final response, including these indexing headers.
  headers.delete("Link");
  if (indexable) {
    headers.delete("X-Robots-Tag");
    if (/^(?:text\/html|application\/pdf)(?:;|$)/i.test(headers.get("Content-Type") ?? "")) {
      const canonicalPath = resolved.relative.split("/").map(encodeURIComponent).join("/");
      headers.set("Link", `<https://www.gecode.dev/doc/latest/${canonicalPath}>; rel="canonical"`);
    }
  } else {
    headers.set("X-Robots-Tag", "noindex");
  }
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function injectAnalytics(request: Request, response: Response): Response {
  if (request.method !== "GET"
      || new URL(request.url).hostname !== "www.gecode.dev"
      || response.status !== 200
      || !/^text\/html(?:;|$)/i.test(response.headers.get("Content-Type") ?? "")) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.delete("ETag");
  headers.delete("Accept-Ranges");
  const html = new HTMLRewriter()
    .on("head", { element(element) { element.append('<script src="/e/init.js" defer></script>', { html: true }); } })
    .transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
  return html;
}

async function sitemapResponse(request: Request, object: R2ObjectBody, resolved: ResolvedPath): Promise<Response> {
  const source = await object.text();
  const text = source.replaceAll(
    `https://www.gecode.dev/doc/${resolved.version}/`,
    "https://www.gecode.dev/doc/latest/",
  );
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const headers = new Headers();
  applyObjectHeaders(headers, object, resolved);
  headers.set("Content-Type", "application/xml; charset=utf-8");
  headers.set("Content-Length", String(bytes.byteLength));
  headers.set("ETag", `"${hash}"`);
  headers.delete("Accept-Ranges");
  const validators = request.headers.get("If-None-Match")?.split(",").map((value) => value.trim().replace(/^W\//, ""));
  if (validators?.some((value) => value === "*" || value === headers.get("ETag"))) {
    return new Response(null, { status: 304, headers });
  }
  // XML ranges refer to the stored bytes, so serve the complete rewritten XML.
  return new Response(request.method === "HEAD" ? null : bytes, { status: 200, headers });
}

async function serve(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(405, "Method not allowed", { Allow: "GET, HEAD" });
  }

  const url = new URL(request.url);
  if (url.pathname === "/robots.txt") {
    return new Response(request.method === "HEAD" ? null : robots, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": String(new TextEncoder().encode(robots).byteLength),
        "Cache-Control": "public, max-age=300",
        "Cloudflare-CDN-Cache-Control": sitemapEdgeCache,
      },
    });
  }
  const redirect = (pathname: string) => {
    const destination = new URL(url);
    destination.pathname = pathname;
    return new Response(null, { status: 308, headers: {
      Location: destination.href,
      "Cache-Control": "public, max-age=300",
      "Cloudflare-CDN-Cache-Control": documentationEdgeCache,
    } });
  };
  if (url.pathname === "/doc" || url.pathname === "/doc/") return redirect("/documentation.html");
  const resolved = resolvePath(url.pathname, env.LATEST_DOC_VERSION);
  if (!resolved) return errorResponse(400, "Invalid documentation path");
  const revisions = configuredRevisions(env.DOC_REVISIONS);
  resolved.revision ??= revisions[resolved.version];
  if (resolved.revision) {
    resolved.key = `_revisions/${resolved.version}/${resolved.revision}/${resolved.relative}`;
  }

  if (resolved.relative === "index.html"
      && !url.pathname.endsWith("/") && !safeDecodePath(url.pathname)!.endsWith("/index.html")) {
    return redirect(`${url.pathname}/`);
  }
  const missingObject = async () => {
    if (!url.pathname.endsWith("/") && await env.DOCS.head(`${resolved.key}/index.html`)) {
      return redirect(`${url.pathname}/`);
    }
    return errorResponse(404, "Documentation page not found");
  };

  if (resolved.isAlias && /^sitemap(?:-\d+)?\.xml$/.test(resolved.relative)) {
    const object = await env.DOCS.get(resolved.key);
    if (!object) return missingObject();
    return sitemapResponse(request, object, resolved);
  }

  // Range applies only to GET. HEAD describes the complete representation.
  const rangeHeader = request.method === "GET" ? request.headers.get("Range") : null;
  if (request.method === "HEAD" || rangeHeader) {
    const metadata = await env.DOCS.head(resolved.key);
    if (!metadata) return missingObject();

    const headers = new Headers();
    applyObjectHeaders(headers, metadata, resolved);
    if (request.headers.get("If-None-Match") === metadata.httpEtag) {
      return new Response(null, { status: 304, headers });
    }

    const ifRange = request.headers.get("If-Range");
    const rangeMatches = !ifRange || ifRange === metadata.httpEtag
      || (!ifRange.startsWith('"') && !ifRange.startsWith("W/")
        && Date.parse(ifRange) === Math.floor(metadata.uploaded.getTime() / 1000) * 1000);
    const range = rangeHeader && rangeMatches ? parseRange(rangeHeader, metadata.size) : null;
    if (range === "invalid") {
      headers.set("Content-Range", `bytes */${metadata.size}`);
      headers.set("Cache-Control", "no-store");
      headers.set("Cloudflare-CDN-Cache-Control", "no-store");
      return new Response(null, { status: 416, headers });
    }
    if (range) {
      headers.set("Content-Length", String(range.length));
      headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`);
      const object = await env.DOCS.get(resolved.key, { range });
      if (!object) throw new Error(`R2 object disappeared during range read: ${resolved.key}`);
      return new Response(object.body, { status: 206, headers });
    }

    headers.set("Content-Length", String(metadata.size));
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    const object = await env.DOCS.get(resolved.key);
    if (!object) throw new Error(`R2 object disappeared during full read: ${resolved.key}`);
    return new Response(object.body, { status: 200, headers });
  }

  const object = await env.DOCS.get(resolved.key);
  if (!object) return missingObject();
  const headers = new Headers();
  applyObjectHeaders(headers, object, resolved);
  if (request.headers.get("If-None-Match") === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env, _context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const ownsPath = pathname === "/robots.txt"
      || pathname === "/doc" || pathname.startsWith("/doc/")
      || pathname === "/doc-latest" || pathname.startsWith("/doc-latest/");
    // Wildcard routes also receive /documentation.html and similarly named
    // website paths. Leave their origin response and indexing headers intact.
    if (!ownsPath) {
      if (url.hostname === "www.gecode.dev") {
        const upstream = await fetch(request);
        const response = new Response(upstream.body, upstream);
        // Do not put neighboring website pages in the documentation cache.
        response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
        return response;
      }
      return applyIndexingPolicy(request, errorResponse(404, "Page not found"), env);
    }

    let response: Response;
    try {
      response = await serve(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "documentation_storage_failure",
        path: new URL(request.url).pathname,
        message: error instanceof Error ? error.message : String(error),
      }));
      response = errorResponse(503, "Documentation is temporarily unavailable", { "Retry-After": "60" });
    }
    response = applyIndexingPolicy(request, response, env);
    response = injectAnalytics(request, response);
    console.log(JSON.stringify({
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
    }));
    return response;
  },
} satisfies ExportedHandler<Env>;
