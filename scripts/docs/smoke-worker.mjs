import assert from "node:assert/strict";

const [base, version] = process.argv.slice(2);
assert(base && /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version ?? ""),
  "Usage: node scripts/docs/smoke-worker.mjs <base-url> <version>");
const origin = new URL(base).origin;

async function check(path, status, options = {}, verify = () => {}) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual", signal: AbortSignal.timeout(30_000), ...options,
  });
  try {
    assert.equal(response.status, status, `${path}: HTTP status`);
    await verify(response);
    console.log(`${options.method ?? "GET"} ${path}: ${status}`);
  } finally {
    await response.body?.cancel();
  }
}

for (const prefix of [`/doc/${version}`, "/doc/latest", "/doc-latest"]) {
  await check(`${prefix}/reference/index.html`, 200, {}, (response) => {
    assert.equal(response.headers.get("x-gecode-documentation-version"), version);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.equal(response.headers.get("link"),
      `<https://www.gecode.dev/doc/${version}/reference/index.html>; rel="canonical"`);
  });
  await check(`${prefix}/reference?smoke=1`, 308, {}, (response) => {
    assert.equal(response.headers.get("location"), `${origin}${prefix}/reference/?smoke=1`);
  });
}

await check("/doc?smoke=1", 308, {}, (response) => {
  assert.equal(response.headers.get("location"), `${origin}/documentation/?smoke=1`);
});
await check(`/doc/${version}/reference/doxygen.css`, 200, {}, (response) => {
  assert.match(response.headers.get("content-type"), /text\/css/);
});
await check("/doc/sitemap.xml", 200, {}, (response) => {
  assert.match(response.headers.get("content-type"), /xml/);
  assert.equal(response.headers.get("x-gecode-documentation-version"), version);
});
await check(`/doc/${version}/readiness-missing-page.html`, 404);

const pdf = `/doc/${version}/MPG.pdf`;
let etag;
await check(pdf, 200, { method: "HEAD", headers: { Range: "bytes=0-15" } }, (response) => {
  assert.match(response.headers.get("content-type"), /application\/pdf/);
  assert(Number(response.headers.get("content-length")) > 16);
  assert.equal(response.headers.get("content-range"), null);
  etag = response.headers.get("etag");
  assert(etag);
});
await check(pdf, 206, { headers: { Range: "bytes=0-15", "If-Range": etag } }, (response) => {
  assert.match(response.headers.get("content-range"), /^bytes 0-15\/\d+$/);
  assert.equal(response.headers.get("content-length"), "16");
});
await check(pdf, 200, { headers: { Range: "bytes=0-15", "If-Range": '"stale-readiness-validator"' } }, (response) => {
  assert.equal(response.headers.get("content-range"), null);
  assert(Number(response.headers.get("content-length")) > 16);
});
console.log(`Documentation smoke checks passed for ${origin}, version ${version}.`);
