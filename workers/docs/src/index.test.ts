import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "./index";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DOCS: R2Bucket;
    LATEST_DOC_VERSION: string;
  }
}

const base = "https://www.gecode.dev";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const context = createExecutionContext();
  const response = await worker.fetch(new Request(`${base}${path}`, init), env, context);
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
    expect(page.headers.get("cache-control")).toContain("immutable");
    expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(page.headers.get("link")).toBe(
      '<https://www.gecode.dev/doc/6.4.0/reference/PageChange.html>; rel="canonical"',
    );

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
      expect(response.headers.get("link")).toBe(
        '<https://www.gecode.dev/doc/6.4.0/reference/PageChange.html>; rel="canonical"',
      );
    },
  );

  it("serves the latest version's sitemap at a stable crawlable URL", async () => {
    const response = await request("/doc/sitemap.xml");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<sitemapindex/>");
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(response.headers.get("link")).toBeNull();
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
    expect((await request("/doc")).headers.get("location")).toBe(`${base}/documentation/`);
  });

  it("returns explicit errors", async () => {
    expect((await request("/doc/6.4.0/missing.html")).status).toBe(404);
    const method = await request("/doc/6.4.0/index.html", { method: "POST" });
    expect(method.status).toBe(405);
    expect(method.headers.get("allow")).toBe("GET, HEAD");
    expect((await request("/doc/%2e%2e/secret")).status).toBe(400);
    expect((await request("/doc/6.4.0/%252e%252e/secret")).status).toBe(400);
    expect((await request("/doc/6.4.0/reference%2fPageChange.html")).status).toBe(400);
  });
});
