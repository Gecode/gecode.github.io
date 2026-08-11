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
    const originalHead = env.DOCS.head.bind(env.DOCS);
    env.DOCS.head = async () => { throw new Error("test outage"); };
    const response = await request("/doc/6.4.0/outage-test.html");
    env.DOCS.head = originalHead;
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
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
