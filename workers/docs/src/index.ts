export interface Env {
  DOCS: R2Bucket;
  LATEST_DOC_VERSION: string;
}

type ResolvedPath = {
  key: string;
  version: string;
  isAlias: boolean;
};

const securityHeaders = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

function errorResponse(status: number, message: string, extraHeaders: HeadersInit = {}): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${status} ${message}</title><body><h1>${status}</h1><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
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
    if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version)) return null;
  }

  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version)) return null;
  if (relative === "" || relative.endsWith("/")) relative += "index.html";
  return { key: `${version}/${relative}`, version, isAlias };
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
  headers.set(
    "Cache-Control",
    resolved.isAlias
      ? "public, max-age=300, s-maxage=300"
      : "public, max-age=3600, s-maxage=31536000, immutable",
  );
  if (object.httpMetadata?.contentType?.toLowerCase().startsWith("text/html")) {
    const canonicalPath = resolved.key.split("/").map(encodeURIComponent).join("/");
    headers.set("Link", `<https://www.gecode.dev/doc/${canonicalPath}>; rel="canonical"`);
  }
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
}

async function serve(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(405, "Method not allowed", { Allow: "GET, HEAD" });
  }

  const url = new URL(request.url);
  const redirect = (pathname: string) => {
    const destination = new URL(url);
    destination.pathname = pathname;
    return Response.redirect(destination.href, 308);
  };
  if (url.pathname === "/doc" || url.pathname === "/doc/") return redirect("/documentation/");
  const resolved = resolvePath(url.pathname, env.LATEST_DOC_VERSION);
  if (!resolved) return errorResponse(400, "Invalid documentation path");

  if (resolved.key === `${resolved.version}/index.html`
      && !url.pathname.endsWith("/") && !safeDecodePath(url.pathname)!.endsWith("/index.html")) {
    return redirect(`${url.pathname}/`);
  }
  const missingObject = async () => {
    if (!url.pathname.endsWith("/") && await env.DOCS.head(`${resolved.key}/index.html`)) {
      return redirect(`${url.pathname}/`);
    }
    return errorResponse(404, "Documentation page not found");
  };

  const cacheableRequest = request.method === "GET"
    && !request.headers.has("Range")
    && !request.headers.has("If-None-Match");
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl, { method: "GET" });
  if (cacheableRequest) {
    try {
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;
    } catch (error) {
      console.error(JSON.stringify({ event: "cache_read_failed", message: String(error) }));
    }
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
  const response = new Response(object.body, { status: 200, headers });
  if (cacheableRequest) {
    context.waitUntil(caches.default.put(cacheKey, response.clone()).catch((error) => {
      console.error(JSON.stringify({ event: "cache_write_failed", message: String(error) }));
    }));
  }
  return response;
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    let response: Response;
    try {
      response = await serve(request, env, context);
    } catch (error) {
      console.error(JSON.stringify({
        event: "documentation_storage_failure",
        path: new URL(request.url).pathname,
        message: error instanceof Error ? error.message : String(error),
      }));
      response = errorResponse(503, "Documentation is temporarily unavailable", { "Retry-After": "60" });
    }
    console.log(JSON.stringify({
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
    }));
    return response;
  },
} satisfies ExportedHandler<Env>;
