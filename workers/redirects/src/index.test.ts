import { describe, expect, it, vi } from "vitest";
import { handleRequest, redirectTarget } from "./index";

describe("classic URL redirects", () => {
  it.each([
    ["https://www.gecode.dev/community.html", "https://www.gecode.dev/community/"],
    ["https://www.gecode.dev/index.html", "https://www.gecode.dev/"],
    [
      "https://www.gecode.dev/publications/a-paper.html?from=classic",
      "https://www.gecode.dev/publications/a-paper/?from=classic",
    ],
  ])("redirects %s", async (source, target) => {
    const response = await handleRequest(new Request(source));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(target);
  });

  it("leaves Doxygen HTML URLs unchanged", () => {
    expect(redirectTarget(new URL("https://www.gecode.dev/doc/latest/reference/PageChange.html"))).toBeNull();
  });

  it("passes canonical and unrelated URLs to GitHub Pages", async () => {
    const originFetch = vi.fn(async () => new Response("origin", { status: 200 }));
    const request = new Request("https://www.gecode.dev/publications/a-paper/");
    const response = await handleRequest(request, originFetch);
    expect(await response.text()).toBe("origin");
    expect(originFetch).toHaveBeenCalledWith(request);
  });

  it("serves cookieless PostHog EU initialization", async () => {
    const request = new Request("https://www.gecode.dev/e/init.js", {
      cf: { country: "SE", continent: "EU" },
    });
    const response = await handleRequest(
      request,
      fetch,
      { POSTHOG_PROJECT_TOKEN: "phc_test" },
    );
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/javascript");
    expect(body).toContain('posthog.init("phc_test",c)');
    expect(body).toContain('"cookieless_mode":"always"');
    expect(body).toContain('"autocapture":false');
    expect(body).toContain('"api_host":"https://www.gecode.dev/e"');
    expect(body).toContain('"ui_host":"https://eu.posthog.com"');
    expect(body).toContain('"gecode_country_code":"SE"');
    expect(body).toContain('"gecode_continent_code":"EU"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fails closed when the PostHog token is not configured", async () => {
    const response = await handleRequest(new Request("https://www.gecode.dev/e/init.js"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("proxies API and asset requests to PostHog EU without cookies", async () => {
    const originFetch = vi.fn(async () => new Response("upstream", {
      headers: { "Set-Cookie": "not-allowed=1" },
    }));
    const request = new Request("https://www.gecode.dev/e/i/v0/e/?ip=1", {
      method: "POST",
      headers: {
        Cookie: "private=1",
        Authorization: "secret",
        "CF-Connecting-IP": "203.0.113.4",
      },
      body: "event",
    });
    const response = await handleRequest(request, originFetch);
    const upstream = originFetch.mock.calls[0][0] as Request;
    expect(upstream.url).toBe("https://eu.i.posthog.com/i/v0/e/?ip=1");
    expect(upstream.headers.get("cookie")).toBeNull();
    expect(upstream.headers.get("authorization")).toBeNull();
    expect(upstream.headers.get("x-forwarded-for")).toBe("203.0.113.4");
    expect(await upstream.text()).toBe("event");
    expect(response.headers.get("set-cookie")).toBeNull();

    await handleRequest(new Request("https://www.gecode.dev/e/static/array.js"), originFetch);
    const asset = originFetch.mock.calls[1][0] as Request;
    expect(asset.url).toBe("https://eu-assets.i.posthog.com/static/array.js");
  });
});
