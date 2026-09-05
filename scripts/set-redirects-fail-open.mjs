import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile("workers/redirects/wrangler.jsonc", "utf8")).env.production;
assert.equal(config.name, "gecode-classic-url-redirects", "Unexpected production redirect Worker");
const patterns = config.routes.map((route) => {
  assert.equal(route.zone_name, "gecode.dev", "Unexpected redirect zone");
  assert(/^www\.gecode\.dev\/(?:[a-z-]+\.html|publications)\*$/.test(route.pattern),
    "Unexpected active-site redirect pattern");
  return route.pattern;
});
assert(patterns.length > 0 && new Set(patterns).size === patterns.length, "Invalid redirect pattern set");

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
assert(/^[a-f0-9]{32}$/i.test(account ?? ""), "CLOUDFLARE_ACCOUNT_ID is required");
assert(token?.trim(), "CLOUDFLARE_API_TOKEN is required");

async function api(path, method = "GET", body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  assert(response.ok, `Cloudflare route request failed (HTTP ${response.status})`);
  const result = await response.json();
  assert.equal(result.success, true, "Cloudflare did not confirm the route request");
  return result.result;
}

const zones = await api(`/zones?name=gecode.dev&account.id=${account}`);
assert.equal(zones.length, 1, "Expected exactly one gecode.dev zone");
assert.equal(zones[0].name, "gecode.dev", "Unexpected zone");
assert.equal(zones[0].account.id, account, "Unexpected zone account");
const routePath = `/zones/${zones[0].id}/workers/routes`;

function redirectRoutes(routes) {
  const owned = routes.filter((route) => route.script === config.name);
  assert.deepEqual(owned.map((route) => route.pattern).sort(), [...patterns].sort(),
    "Live redirect routes must match the production configuration");
  for (const pattern of patterns) {
    const matches = routes.filter((route) => route.pattern === pattern);
    assert.equal(matches.length, 1, "Expected exactly one route for each redirect pattern");
    assert.equal(matches[0].script, config.name, "Redirect route belongs to another Worker");
  }
  return owned;
}

// Wrangler does not configure this flag. Apply it only after checking the
// complete redirect route set, so documentation routes remain fail closed.
for (const route of redirectRoutes(await api(routePath))) {
  if (route.request_limit_fail_open === true) continue;
  await api(`${routePath}/${route.id}`, "PUT", {
    pattern: route.pattern,
    script: config.name,
    request_limit_fail_open: true,
  });
}
assert(redirectRoutes(await api(routePath)).every((route) => route.request_limit_fail_open === true),
  "Redirect routes did not retain fail-open behavior");
console.log(`Verified fail-open behavior for ${patterns.length} production redirect routes.`);
