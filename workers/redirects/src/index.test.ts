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
});
