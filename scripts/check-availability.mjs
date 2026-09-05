import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = "https://www.gecode.dev";
const config = JSON.parse(await readFile("workers/docs/wrangler.jsonc", "utf8")).env.production.vars;
const version = config.LATEST_DOC_VERSION;
const revision = JSON.parse(config.DOC_REVISIONS ?? "{}")[version];
assert(/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version), "Invalid production documentation version");
assert(revision === undefined || /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(revision),
  "Invalid production documentation revision");

async function bytes(response) {
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    assert(length <= 1_000_000, "Availability response exceeded 1 MB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function check(path, status, verify, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual", signal: AbortSignal.timeout(10_000), ...options,
  });
  try {
    assert.equal(response.status, status, `${path}: HTTP status`);
    await verify(response);
    console.log(`${options.method ?? "GET"} ${path}: ${status}`);
  } catch (error) {
    throw new Error(`${path}: ${error.message}`, { cause: error });
  } finally {
    if (!response.bodyUsed) await response.body?.cancel();
  }
}

function docsHeaders(response, relative, indexable) {
  assert.equal(response.headers.get("x-gecode-documentation-version"), version, "Selected version");
  assert.equal(response.headers.get("x-gecode-documentation-revision"), revision ?? "legacy", "Selected revision");
  assert.equal(/\bnoindex\b/i.test(response.headers.get("x-robots-tag") ?? ""), !indexable, "Indexing policy");
  assert.equal(response.headers.get("link"), indexable
    ? `<${origin}/doc/latest/${relative}>; rel="canonical"` : null, "Documentation canonical");
}

for (const path of ["/", "/download/"]) {
  await check(path, 200, async (response) => {
    assert.match(response.headers.get("content-type"), /text\/html/);
    const html = (await bytes(response)).toString();
    assert.match(html, /<meta name="generator" content="Astro /, "Astro page");
    assert(html.includes(`<link rel="canonical" href="${origin}${path}">`), "Website canonical");
    assert(!/\bnoindex\b/i.test(response.headers.get("x-robots-tag") ?? ""), "Website must remain indexable");
  });
}
await check("/download.html?availability=1", 308, (response) => {
  assert.equal(response.headers.get("location"), `${origin}/download/?availability=1`);
});
await check("/users-archive/index.html", 200, async (response) => {
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match((await bytes(response)).toString(), /Gecode users archive/);
});
await check("/robots.txt?availability=1", 200, async (response) => {
  assert.match(response.headers.get("content-type"), /text\/plain/);
  const text = (await bytes(response)).toString();
  assert(text.includes(`Sitemap: ${origin}/doc/sitemap.xml`));
  assert.doesNotMatch(text, /^Disallow:\s*\/(?:\s*$|doc(?:\/latest)?\/?\s*$|doc-latest)/m,
    "Robots rules must allow latest documentation crawling");
});
await check("/doc/latest/reference/index.html", 200, async (response) => {
  docsHeaders(response, "reference/index.html", true);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match((await bytes(response)).toString(), /<html\b/i);
});
await check(`/doc/${version}/reference/index.html`, 200, (response) => {
  docsHeaders(response, "reference/index.html", false);
  assert.match(response.headers.get("content-type"), /text\/html/);
}, { method: "HEAD" });
await check("/doc/sitemap.xml", 200, async (response) => {
  assert.match(response.headers.get("content-type"), /xml/);
  const xml = (await bytes(response)).toString();
  assert.match(xml, /<sitemapindex\b/);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert(locations.length > 0 && locations.every((url) => url.startsWith(`${origin}/doc/latest/`)),
    "Documentation sitemap must advertise latest URLs");
});
const pdf = `/doc/${version}/MPG.pdf`;
await check(pdf, 200, (response) => {
  docsHeaders(response, "MPG.pdf", false);
  assert.match(response.headers.get("content-type"), /application\/pdf/);
  assert(Number(response.headers.get("content-length")) > 16, "PDF size");
}, { method: "HEAD" });
await check(pdf, 206, async (response) => {
  docsHeaders(response, "MPG.pdf", false);
  assert.equal(response.headers.get("content-length"), "16");
  assert.match(response.headers.get("content-range"), /^bytes 0-15\/\d+$/);
  const body = await bytes(response);
  assert.equal(body.length, 16);
  assert.equal(body.subarray(0, 5).toString(), "%PDF-");
}, { headers: { Range: "bytes=0-15" } });

if (revision) {
  await check("/doc/latest/modeling/index.html", 200, async (response) => {
    docsHeaders(response, "modeling/index.html", true);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match((await bytes(response)).toString(), /pagefind/i, "Modeling search UI");
  });
  await check("/doc/latest/modeling/pagefind/pagefind.js", 200, async (response) => {
    assert.match(response.headers.get("content-type"), /(?:text|application)\/javascript/);
    assert((await bytes(response)).length > 0, "Modeling search runtime");
  });
}
console.log(`Production availability passed: documentation ${version}, revision ${revision ?? "legacy"}.`);
