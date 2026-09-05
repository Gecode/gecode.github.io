import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DOCS: R2Bucket;
    LATEST_DOC_VERSION: string;
    DOC_REVISIONS?: string;
  }
}

const base = "https://www.gecode.dev";

async function request(path: string, init?: RequestInit, latestVersion = env.LATEST_DOC_VERSION, revisions = env.DOC_REVISIONS): Promise<Response> {
  const context = createExecutionContext();
  const response = await worker.fetch(new Request(new URL(path, base), init), { ...env, LATEST_DOC_VERSION: latestVersion, DOC_REVISIONS: revisions }, context);
  await waitOnExecutionContext(context);
  return response;
}

beforeEach(async () => {
  const objects = await env.DOCS.list();
  await Promise.all(objects.objects.map((object) => env.DOCS.delete(object.key)));
  await env.DOCS.put("6.4.0/index.html", "release home", {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  await env.DOCS.put("6.4.0/reference/PageChange.html", "0123456789", {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  await env.DOCS.put("6.4.0/sitemap.xml", "<sitemapindex/>", {
    httpMetadata: { contentType: "application/xml; charset=utf-8" },
  });
});

describe("documentation worker", () => {
  it("serves versioned and directory URLs", async () => {
    const page = await request("/doc/6.4.0/reference/PageChange.html");
    expect(page.status).toBe(200);
    expect(await page.text()).toBe("0123456789");
    expect(page.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
    expect(page.headers.get("x-gecode-documentation-revision")).toBe("legacy");
    expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(page.headers.get("link")).toBeNull();
    expect(page.headers.get("x-robots-tag")).toBe("noindex");

    const index = await request("/doc/6.4.0/");
    expect(await index.text()).toBe("release home");
    expect((await request("/doc/6.4.0/%69ndex.html")).status).toBe(200);
  });

  it("serves repeat requests from the edge cache", async () => {
    const url = "/doc/6.4.0/reference/PageChange.html?cache-test=1";
    expect((await request(url)).status).toBe(200);
    await env.DOCS.delete("6.4.0/reference/PageChange.html");
    const cached = await request("/doc/6.4.0/reference/PageChange.html?different-query=1");
    expect(cached.status).toBe(200);
    expect(await cached.text()).toBe("0123456789");
  });

  it("returns 503 when R2 fails", async () => {
    const originalGet = env.DOCS.get.bind(env.DOCS);
    env.DOCS.get = async () => { throw new Error("test outage"); };
    const response = await request("/doc/6.4.0/outage-test.html");
    env.DOCS.get = originalGet;
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("uses one R2 read for an ordinary cache miss", async () => {
    await env.DOCS.put("6.4.0/one-read.html", "one read", {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    const originalGet = env.DOCS.get.bind(env.DOCS);
    const originalHead = env.DOCS.head.bind(env.DOCS);
    let gets = 0;
    let heads = 0;
    env.DOCS.get = async (...args) => {
      gets += 1;
      return originalGet(...args);
    };
    env.DOCS.head = async (...args) => {
      heads += 1;
      return originalHead(...args);
    };

    let response: Response;
    try {
      response = await request("/doc/6.4.0/one-read.html");
    } finally {
      env.DOCS.get = originalGet;
      env.DOCS.head = originalHead;
    }

    expect(response.status).toBe(200);
    expect(gets).toBe(1);
    expect(heads).toBe(0);
  });

  it.each(["/doc/latest/reference/PageChange.html", "/doc-latest/reference/PageChange.html"])(
    "resolves the latest alias at %s",
    async (path) => {
      const response = await request(path);
      expect(await response.text()).toBe("0123456789");
      expect(response.headers.get("cache-control")).toContain("max-age=300");
      expect(response.headers.get("x-gecode-documentation-version")).toBe("6.4.0");
      const canonical = path.startsWith("/doc/latest/");
      expect(response.headers.get("x-robots-tag")).toBe(canonical ? null : "noindex");
      expect(response.headers.get("link")).toBe(canonical
        ? '<https://www.gecode.dev/doc/latest/reference/PageChange.html>; rel="canonical"'
        : null);
    },
  );

  it("serves the latest version's sitemap at a stable crawlable URL", async () => {
    const response = await request("/doc/sitemap.xml");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<sitemapindex/>");
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(response.headers.get("link")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("keeps historical versions and staging out of the index", async () => {
    await env.DOCS.put("6.2.0/reference/PageChange.html", "historical content", {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    for (const path of [
      "/doc/6.2.0/reference/PageChange.html",
      "/doc/6.4.0/reference/PageChange.html",
      "https://docs-staging.gecode.dev/doc/latest/reference/PageChange.html",
      "https://preview.workers.dev/doc/latest/reference/PageChange.html",
    ]) {
      const response = await request(path);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
      expect(response.headers.get("link")).toBeNull();
    }
  });

  it("applies the current indexing policy even to cached headers", async () => {
    const match = vi.spyOn(caches.default, "match").mockImplementation(async () => new Response("cached content", {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        Link: '<https://www.gecode.dev/doc/6.4.0/reference/PageChange.html>; rel="canonical"',
        "X-Robots-Tag": "index",
      },
    }));
    try {
      const immutable = await request("/doc/6.4.0/reference/PageChange.html");
      expect(await immutable.text()).toBe("cached content");
      expect(immutable.headers.get("x-robots-tag")).toBe("noindex");
      expect(immutable.headers.get("link")).toBeNull();
      const latest = await request("/doc/latest/reference/PageChange.html");
      expect(await latest.text()).toBe("cached content");
      expect(latest.headers.get("x-robots-tag")).toBeNull();
      expect(latest.headers.get("link")).toBe(
        '<https://www.gecode.dev/doc/latest/reference/PageChange.html>; rel="canonical"',
      );
    } finally {
      match.mockRestore();
    }
  });

  it("selects new latest content without reusing the preceding release's cache", async () => {
    await request("/doc/latest/reference/PageChange.html");
    await env.DOCS.put("7.0.0/reference/PageChange.html", "new release", {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    const response = await request("/doc/latest/reference/PageChange.html", undefined, "7.0.0");
    expect(await response.text()).toBe("new release");
    expect(response.headers.get("x-gecode-documentation-version")).toBe("7.0.0");
    expect(response.headers.get("link")).toBe(
      '<https://www.gecode.dev/doc/latest/reference/PageChange.html>; rel="canonical"',
    );
  });

  it("rewrites selected sitemap indexes and shards without changing versioned objects", async () => {
    const version = "6.5.0";
    const indexXml = '<sitemapindex><sitemap><loc>https://www.gecode.dev/doc/6.5.0/sitemap-1.xml</loc></sitemap></sitemapindex>';
    const shardXml = '<urlset><url><loc>https://www.gecode.dev/doc/6.5.0/reference/PageChange.html</loc></url></urlset>';
    await env.DOCS.put(`${version}/sitemap.xml`, indexXml, { httpMetadata: { contentType: "application/xml" } });
    await env.DOCS.put(`${version}/sitemap-1.xml`, shardXml, { httpMetadata: { contentType: "application/xml" } });
    // Entries cached before the indexing-policy change must not leak old URLs.
    await caches.default.put(new Request(`${base}/doc/sitemap.xml`), new Response(indexXml, {
      headers: { "Cache-Control": "public, max-age=300", "Content-Type": "application/xml" },
    }));
    for (const path of ["/doc/sitemap.xml", "/doc/latest/sitemap.xml", "/doc-latest/sitemap.xml"]) {
      const response = await request(path, undefined, version);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(indexXml.replaceAll(`/doc/${version}/`, "/doc/latest/"));
    }
    const shard = await request("/doc/latest/sitemap-1.xml", undefined, version);
    expect(await shard.text()).toBe(shardXml.replaceAll(`/doc/${version}/`, "/doc/latest/"));
    expect(shard.headers.get("x-robots-tag")).toBeNull();
    const historical = await request(`/doc/${version}/sitemap-1.xml`, undefined, version);
    expect(await historical.text()).toBe(shardXml);
    expect(historical.headers.get("x-robots-tag")).toBe("noindex");
    expect(await (await env.DOCS.get(`${version}/sitemap-1.xml`))!.text()).toBe(shardXml);
  });

  it("uses rewritten sitemap lengths and validators for GET, HEAD and conditional requests", async () => {
    const xml = '<urlset><url><loc>https://www.gecode.dev/doc/6.4.0/reference/例.html</loc></url></urlset>';
    const stored = await env.DOCS.put("6.4.0/sitemap-1.xml", xml, { httpMetadata: { contentType: "application/xml" } });
    const expected = xml.replaceAll("/doc/6.4.0/", "/doc/latest/");
    const path = "/doc/latest/sitemap-1.xml";
    const response = await request(path);
    const etag = response.headers.get("etag")!;
    expect(etag).not.toBe(stored.httpEtag);
    expect(response.headers.get("content-length")).toBe(String(new TextEncoder().encode(expected).byteLength));
    expect(await response.text()).toBe(expected);
    const head = await request(path, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(etag);
    expect(head.headers.get("content-length")).toBe(response.headers.get("content-length"));
    const conditional = await request(path, { headers: { "If-None-Match": `W/${etag}` } });
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe("");
    expect(conditional.headers.get("etag")).toBe(etag);
    const oldValidator = await request(path, { headers: { "If-None-Match": stored.httpEtag } });
    expect(oldValidator.status).toBe(200);
    const range = await request(path, { headers: { Range: "bytes=0-10" } });
    expect(range.status).toBe(200);
    expect(range.headers.get("content-range")).toBeNull();
    expect(await range.text()).toBe(expected);
  });

  it("serves shared robots rules that allow latest documentation crawling", async () => {
    const response = await request("/robots.txt");
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).not.toMatch(/^Disallow:\s*\/doc(?:\/latest|-latest)/m);
    expect(body).toContain("Sitemap: https://www.gecode.dev/doc/sitemap.xml");
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    const head = await request("/robots.txt", { method: "HEAD" });
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-length")).toBe(String(new TextEncoder().encode(body).byteLength));
  });

  it("supports HEAD and conditional requests", async () => {
    const head = await request("/doc/6.4.0/reference/PageChange.html", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("10");
    expect(await head.text()).toBe("");

    const cached = await request("/doc/6.4.0/reference/PageChange.html", {
      headers: { "If-None-Match": head.headers.get("etag")! },
    });
    expect(cached.status).toBe(304);
    expect(cached.headers.get("x-robots-tag")).toBe("noindex");
    expect(cached.headers.get("link")).toBeNull();
  });

  it("keeps PDF indexing headers consistent on GET, HEAD, ranges and 304 responses", async () => {
    const object = await env.DOCS.put("6.4.0/MPG.pdf", "0123456789", {
      httpMetadata: { contentType: "application/pdf" },
    });
    for (const path of ["/doc/6.4.0/MPG.pdf", "/doc/latest/MPG.pdf", "/doc-latest/MPG.pdf", "https://docs-staging.gecode.dev/doc/latest/MPG.pdf"]) {
      for (const init of [undefined, { method: "HEAD" }, { headers: { Range: "bytes=0-3" } }, { headers: { "If-None-Match": object.httpEtag } }]) {
        const response = await request(path, init);
        const canonical = path === "/doc/latest/MPG.pdf";
        expect(response.headers.get("x-robots-tag")).toBe(canonical ? null : "noindex");
        expect(response.headers.get("link")).toBe(canonical
          ? '<https://www.gecode.dev/doc/latest/MPG.pdf>; rel="canonical"'
          : null);
      }
    }
  });

  it("supports byte and suffix ranges", async () => {
    const range = await request("/doc/6.4.0/reference/PageChange.html", { headers: { Range: "bytes=2-5" } });
    expect(range.status).toBe(206);
    expect(await range.text()).toBe("2345");
    expect(range.headers.get("content-range")).toBe("bytes 2-5/10");

    const suffix = await request("/doc/6.4.0/reference/PageChange.html", { headers: { Range: "bytes=-3" } });
    expect(await suffix.text()).toBe("789");
  });

  it("rejects unsatisfiable ranges", async () => {
    const response = await request("/doc/6.4.0/reference/PageChange.html", { headers: { Range: "bytes=20-30" } });
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
  });

  it("resumes PDFs only when If-Range matches the current representation", async () => {
    const object = await env.DOCS.put("6.4.0/MPG.pdf", "new PDF bytes", {
      httpMetadata: { contentType: "application/pdf" },
    });
    for (const validator of ['"old-etag"', `W/${object.httpEtag}`, "Thu, 01 Jan 1970 00:00:00 GMT"]) {
      const response = await request("/doc/latest/MPG.pdf", {
        headers: { Range: "bytes=4-6", "If-Range": validator },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-range")).toBeNull();
      expect(new TextDecoder().decode(await response.arrayBuffer())).toBe("new PDF bytes");
    }
    const matching = await request("/doc/latest/MPG.pdf", {
      headers: { Range: "bytes=4-6", "If-Range": object.httpEtag },
    });
    expect(matching.status).toBe(206);
    expect(new TextDecoder().decode(await matching.arrayBuffer())).toBe("PDF");
    const head = await request("/doc/latest/MPG.pdf", {
      method: "HEAD", headers: { Range: "bytes=4-6" },
    });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("13");
  });

  it("redirects directory entry points while preserving queries and relative links", async () => {
    await env.DOCS.put("6.4.0/reference/index.html", "reference home");
    await env.DOCS.put("6.4.0/modeling/chapter/index.html", "chapter");
    for (const path of ["/doc/6.4.0", "/doc/latest", "/doc-latest", "/doc/6.4.0/reference", "/doc/latest/modeling/chapter"]) {
      const response = await request(`${path}?view=1`);
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(`${base}${path}/?view=1`);
    }
    expect((await request("/doc/6.4.0/missing-directory")).status).toBe(404);
    for (const path of ["/doc", "/doc/", "/doc?smoke=1", "/doc/?smoke=1"]) {
      const response = await request(path);
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(`${base}/documentation.html${path.includes("?") ? "?smoke=1" : ""}`);
    }
  });

  it("passes neighboring website paths through without changing requests or responses", async () => {
    const originFetch = vi.spyOn(globalThis, "fetch");
    try {
      for (const [path, method, status] of [
        ["/documentation.html?smoke=1", "GET", 200],
        ["/documentation/", "HEAD", 404],
        ["/documents/submit?draft=1", "POST", 201],
        ["/doc-latest-news.html", "GET", 200],
        ["/robots.txt.bak?download=1", "GET", 404],
      ] as const) {
        const incoming = new Request(`${base}${path}`, {
          method, headers: { "X-Request-Test": "preserved" },
          body: method === "POST" ? "submission bytes" : undefined,
        });
        const upstream = new Response(method === "HEAD" ? null : "origin content", {
          status,
          headers: {
            "Content-Type": "text/html",
            "X-Robots-Tag": "index, follow",
            Link: '<https://www.gecode.dev/documentation/>; rel="canonical"',
          },
        });
        originFetch.mockResolvedValueOnce(upstream);
        const context = createExecutionContext();
        const response = await worker.fetch(incoming, env, context);
        await waitOnExecutionContext(context);
        expect(originFetch).toHaveBeenLastCalledWith(incoming);
        expect(response).toBe(upstream);
        expect(response.status).toBe(status);
        expect(response.headers.get("x-robots-tag")).toBe("index, follow");
        expect(response.headers.get("link")).toBe('<https://www.gecode.dev/documentation/>; rel="canonical"');
        if (method === "POST") expect(await incoming.text()).toBe("submission bytes");
      }
      const staging = await request("https://docs-staging.gecode.dev/documentation.html");
      expect(staging.status).toBe(404);
      expect(staging.headers.get("x-robots-tag")).toBe("noindex");
      expect(originFetch).toHaveBeenCalledTimes(5);
    } finally {
      originFetch.mockRestore();
    }
  });

  it("returns explicit errors", async () => {
    expect((await request("/doc/6.4.0/missing.html")).status).toBe(404);
    const method = await request("/doc/6.4.0/index.html", { method: "POST" });
    expect(method.status).toBe(405);
    expect(method.headers.get("allow")).toBe("GET, HEAD");
    expect((await request("/doc/6.4.0/%")).status).toBe(400);
    expect((await request("/doc/6.4.0/%252e%252e/secret")).status).toBe(400);
    expect((await request("/doc/6.4.0/reference%2fPageChange.html")).status).toBe(400);
  });
  it("promotes revisions without reusing the previous selection's cache", async () => {
    const relative = "modeling/revision-test/index.html";
    for (const [revision, body] of [["r1", "first"], ["r2", "second"]]) {
      await env.DOCS.put(`_revisions/6.4.0/${revision}/${relative}`, body, {
        httpMetadata: { contentType: "text/html" },
      });
    }
    for (const prefix of ["/doc/6.4.0/", "/doc/latest/"]) {
      const first = await request(prefix + relative, undefined, "6.4.0", '{"6.4.0":"r1"}');
      expect(await first.text()).toBe("first");
      const promoted = await request(prefix + relative, undefined, "6.4.0", '{"6.4.0":"r2"}');
      expect(await promoted.text()).toBe("second");
      expect(promoted.headers.get("x-gecode-documentation-version")).toBe("6.4.0");
      expect(promoted.headers.get("x-gecode-documentation-revision")).toBe("r2");
      expect(promoted.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
      const rollback = await request(prefix + relative, undefined, "6.4.0", '{"6.4.0":"r1"}');
      expect(await rollback.text()).toBe("first");
    }
    // A selected incomplete bundle must not silently mix in the old release.
    expect((await request("/doc/6.4.0/reference/PageChange.html", undefined, "6.4.0", '{"6.4.0":"r2"}')).status).toBe(404);
  });

  it("serves immutable revision previews without changing public canonical paths", async () => {
    const revision = "manual-2026.09_2";
    const prefix = `/doc/6.4.0/revisions/${revision}`;
    await env.DOCS.put(`_revisions/6.4.0/${revision}/index.html`, "preview", {
      httpMetadata: { contentType: "text/html" },
    });
    const preview = await request(prefix + "/", undefined, "6.4.0", '{"6.4.0":"other"}');
    expect(await preview.text()).toBe("preview");
    expect(preview.headers.get("x-gecode-documentation-revision")).toBe(revision);
    expect(preview.headers.get("cache-control")).toContain("immutable");
    expect(preview.headers.get("x-robots-tag")).toBe("noindex");
    expect(preview.headers.get("link")).toBeNull();
    expect((await request(prefix)).headers.get("location")).toBe(`${base}${prefix}/`);
    expect((await request("/doc/latest/revisions/r1/")).status).toBe(400);
  });

  it("keeps PDF ranges and validators on the selected revision", async () => {
    const object = await env.DOCS.put("_revisions/6.4.0/pdf-r2/MPG.pdf", "new PDF bytes", {
      httpMetadata: { contentType: "application/pdf" },
    });
    const revisions = '{"6.4.0":"pdf-r2"}';
    const path = "/doc/latest/MPG.pdf";
    for (const init of [undefined, { method: "HEAD" }, { headers: { Range: "bytes=4-6" } }, { headers: { "If-None-Match": object.httpEtag } }]) {
      const response = await request(path, init, "6.4.0", revisions);
      expect(response.headers.get("x-gecode-documentation-revision")).toBe("pdf-r2");
      expect(response.headers.get("link")).toBe('<https://www.gecode.dev/doc/latest/MPG.pdf>; rel="canonical"');
      if (init?.headers && "Range" in init.headers) {
        expect(response.status).toBe(206);
        expect(new TextDecoder().decode(await response.arrayBuffer())).toBe("PDF");
      }
    }
    const stale = await request(path, { headers: { Range: "bytes=4-6", "If-Range": '"old-revision"' } }, "6.4.0", revisions);
    expect(stale.status).toBe(200);
    expect(new TextDecoder().decode(await stale.arrayBuffer())).toBe("new PDF bytes");
  });

  it("rewrites selected revision sitemaps using only public version URLs", async () => {
    const xml = '<urlset><url><loc>https://www.gecode.dev/doc/6.4.0/modeling/chapter/</loc></url></urlset>';
    await env.DOCS.put("_revisions/6.4.0/sitemap-r2/sitemap.xml", xml, {
      httpMetadata: { contentType: "application/xml" },
    });
    const revisions = '{"6.4.0":"sitemap-r2"}';
    const latest = await request("/doc/sitemap.xml", undefined, "6.4.0", revisions);
    expect(await latest.text()).toBe(xml.replaceAll("/doc/6.4.0/", "/doc/latest/"));
    expect(latest.headers.get("x-gecode-documentation-revision")).toBe("sitemap-r2");
    for (const path of ["/doc/6.4.0/sitemap.xml", "/doc/6.4.0/revisions/sitemap-r2/sitemap.xml"]) {
      const response = await request(path, undefined, "6.4.0", revisions);
      expect(await response.text()).toBe(xml);
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
    }
  });

  it.each([
    "{", "null", "[]", '{"6.4.0":null}', '{"6.4.0":42}',
    '{"6.4.0":"../escape"}', '{"6.4.0":""}', '{"bad-version":"r1"}',
    JSON.stringify({ "6.4.0": "r".repeat(129) }),
  ])("fails closed for malformed revision configuration: %s", async (revisions) => {
    await request("/doc/6.4.0/reference/PageChange.html");
    const response = await request("/doc/6.4.0/reference/PageChange.html", undefined, "6.4.0", revisions);
    expect(response.status).toBe(503);
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

});
