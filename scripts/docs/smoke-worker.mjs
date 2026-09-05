import assert from "node:assert/strict";

const [base, version, ...options] = process.argv.slice(2);
assert(base && /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version ?? ""),
  "Usage: node scripts/docs/smoke-worker.mjs <base-url> <version> [--revision <id>] [--immutable-only]");
let revision;
let immutableOnly = false;
for (let index = 0; index < options.length; index++) {
  if (options[index] === "--immutable-only") immutableOnly = true;
  else if (options[index] === "--revision") {
    revision = options[++index];
    assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(revision ?? ""), "Invalid documentation revision");
  } else assert.fail(`Unknown smoke-check option: ${options[index]}`);
}
const origin = new URL(base).origin;
const production = origin === "https://www.gecode.dev";
const latestBase = "https://www.gecode.dev/doc/latest/";

function assertNoindex(response, expected = true) {
  const noindex = /\bnoindex\b/i.test(response.headers.get("x-robots-tag") ?? "");
  assert.equal(noindex, expected, "Unexpected documentation indexing policy");
}

async function check(path, status, options = {}, verify = () => {}) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual", signal: AbortSignal.timeout(30_000), ...options,
  });
  try {
    assert.equal(response.status, status, `${path}: HTTP status`);
    if (!production || path.startsWith(`/doc/${version}/`) || path.startsWith("/doc-latest/")) {
      assertNoindex(response);
    }
    if ([200, 206, 304].includes(status) && /^\/(?:doc\/|doc-latest\/)/.test(path)) {
      assert.equal(response.headers.get("x-gecode-documentation-version"), version, `${path}: selected version`);
      assert.equal(response.headers.get("x-gecode-documentation-revision"), revision ?? "legacy", `${path}: selected revision`);
    }
    await verify(response);
    console.log(`${options.method ?? "GET"} ${path}: ${status}`);
  } finally {
    if (!response.bodyUsed) await response.body?.cancel();
  }
}

const prefixes = [`/doc/${version}`];
if (revision) prefixes.push(`/doc/${version}/revisions/${revision}`);
if (!immutableOnly) prefixes.push("/doc/latest", "/doc-latest");

function assertCanonical(response, prefix, relative) {
  const indexable = production && prefix === "/doc/latest";
  assertNoindex(response, !indexable);
  assert.equal(response.headers.get("link"), indexable
    ? `<${latestBase}${relative}>; rel="canonical"` : null);
}

for (const prefix of prefixes) {
  await check(`${prefix}/reference/index.html`, 200, {}, (response) => {
    assert.equal(response.headers.get("x-gecode-documentation-version"), version);
    assert.match(response.headers.get("content-type"), /text\/html/);
    const indexable = production && prefix === "/doc/latest";
    assertNoindex(response, !indexable);
    assert.equal(response.headers.get("link"), indexable
      ? `<${latestBase}reference/index.html>; rel="canonical"` : null);
  });
  await check(`${prefix}/reference?smoke=1`, 308, {}, (response) => {
    assert.equal(response.headers.get("location"), `${origin}${prefix}/reference/?smoke=1`);
  });
  if (revision) {
    for (const relative of ["index.html", "modeling/index.html", "modeling/search/index.html"]) {
      await check(`${prefix}/${relative}`, 200, {}, async (response) => {
        assert.match(response.headers.get("content-type"), /text\/html/);
        assertCanonical(response, prefix, relative);
        const html = await response.text();
        assert.match(html, /<html\b/i, `${relative}: HTML document`);
        if (relative.startsWith("modeling/")) assert.match(html, /pagefind/i, `${relative}: search UI`);
      });
    }
    for (const [relative, mime] of [
      ["modeling/_static/mpg.css", /text\/css/],
      ["modeling/_static/mpg-search.js", /(?:text|application)\/javascript/],
      ["modeling/pagefind/pagefind.js", /(?:text|application)\/javascript/],
      ["modeling/pagefind/pagefind-component-ui.js", /(?:text|application)\/javascript/],
      ["modeling/pagefind/pagefind-component-ui.css", /text\/css/],
    ]) {
      await check(`${prefix}/${relative}`, 200, {}, (response) => {
        assert.match(response.headers.get("content-type"), mime, `${relative}: asset content type`);
      });
    }
    let language;
    await check(`${prefix}/modeling/pagefind/pagefind-entry.json`, 200, {}, async (response) => {
      assert.match(response.headers.get("content-type"), /application\/json/);
      const index = await response.json();
      language = index.languages?.en;
      assert(language?.page_count > 0, "English search index is empty");
      assert(/^[A-Za-z0-9_-]+$/.test(language.hash), "Invalid search metadata filename");
      assert(/^[A-Za-z0-9_-]+$/.test(language.wasm), "Invalid search runtime filename");
    });
    for (const asset of [`pagefind.${language.hash}.pf_meta`, `wasm.${language.wasm}.pagefind`]) {
      await check(`${prefix}/modeling/pagefind/${asset}`, 200);
    }
    await check(`${prefix}/readiness-missing-page.html`, 404);
  }
}

if (!immutableOnly) {
  await check("/doc?smoke=1", 308, {}, (response) => {
    assert.equal(response.headers.get("location"), `${origin}/documentation.html?smoke=1`);
  });
  await check("/robots.txt?smoke=1", 200, {}, async (response) => {
    assert.match(response.headers.get("content-type"), /text\/plain/);
    const body = await response.text();
    assert.doesNotMatch(body, /^Disallow:\s*\/doc(?:\/latest|-latest)/m);
    assert.match(body, /^Sitemap: https:\/\/www\.gecode\.dev\/doc\/sitemap\.xml$/m);
  });
  if (production) {
    await check("/documentation.html?smoke=1", 200, { redirect: "follow" }, (response) => {
      assertNoindex(response, false);
      assert.equal(response.headers.get("x-gecode-documentation-version"), null);
    });
  }
}
await check(`/doc/${version}/reference/doxygen.css`, 200, {}, (response) => {
  assert.match(response.headers.get("content-type"), /text\/css/);
});
async function checkSitemap(indexPath, latestUrls) {
  let shardPath;
  const locations = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  await check(indexPath, 200, {}, async (response) => {
    assert.match(response.headers.get("content-type"), /xml/);
    assert.equal(response.headers.get("x-gecode-documentation-version"), version);
    const xml = await response.text();
    assert.match(xml, /<sitemapindex\b/);
    const urls = locations(xml);
    assert(urls.length > 0, "Documentation sitemap index is empty");
    if (latestUrls) assert(urls.every((url) => url.startsWith(latestBase)), "Sitemap index must advertise only latest URLs");
    const first = new URL(urls[0]);
    assert.equal(first.origin, "https://www.gecode.dev");
    shardPath = first.pathname;
    assert(shardPath.startsWith(latestUrls ? "/doc/latest/" : `/doc/${version}/`));
  });
  await check(shardPath, 200, {}, async (response) => {
    assert.match(response.headers.get("content-type"), /xml/);
    assert.equal(response.headers.get("x-gecode-documentation-version"), version);
    const xml = await response.text();
    assert.match(xml, /<urlset\b/);
    const urls = locations(xml);
    assert(urls.length > 0, "Documentation sitemap shard is empty");
    if (latestUrls) assert(urls.every((url) => url.startsWith(latestBase)), "Sitemap shard must advertise only latest URLs");
  });
}
await checkSitemap(`/doc/${version}/sitemap.xml`, false);
if (!immutableOnly) await checkSitemap("/doc/sitemap.xml", true);
await check(`/doc/${version}/readiness-missing-page.html`, 404);

for (const prefix of prefixes) {
  const pdf = `${prefix}/MPG.pdf`;
  let etag;
  await check(pdf, 200, { method: "HEAD", headers: { Range: "bytes=0-15" } }, (response) => {
    assert.match(response.headers.get("content-type"), /application\/pdf/);
    assert(Number(response.headers.get("content-length")) > 16);
    assert.equal(response.headers.get("content-range"), null);
    assertCanonical(response, prefix, "MPG.pdf");
    etag = response.headers.get("etag");
    assert(etag);
  });
  await check(pdf, 206, { headers: { Range: "bytes=0-15", "If-Range": etag } }, async (response) => {
    assert.match(response.headers.get("content-range"), /^bytes 0-15\/\d+$/);
    assert.equal(response.headers.get("content-length"), "16");
    assertCanonical(response, prefix, "MPG.pdf");
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(bytes.length, 16, `${pdf}: range response length`);
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-", `${pdf}: PDF signature`);
  });
  await check(pdf, 200, { headers: { Range: "bytes=0-15", "If-Range": '"stale-readiness-validator"' } }, (response) => {
    assert.equal(response.headers.get("content-range"), null);
    assert(Number(response.headers.get("content-length")) > 16);
  });
}
console.log(`Documentation smoke checks passed for ${origin}, version ${version}, revision ${revision ?? "legacy"}.`);
