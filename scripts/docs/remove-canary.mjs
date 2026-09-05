import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile("workers/docs/wrangler.jsonc", "utf8"));
const name = config.env.canary.name;
assert.equal(name, "gecode-documentation-canary", "Refusing to delete any Worker other than the documentation canary");

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
assert(/^[a-f0-9]{32}$/i.test(account ?? ""), "CLOUDFLARE_ACCOUNT_ID is required");
assert(token?.trim(), "CLOUDFLARE_API_TOKEN is required");

// Wrangler also tries to clean up legacy Workers Sites KV namespaces. This
// canary has no KV resources, and its deployment token intentionally cannot list them.
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(30_000),
});
assert(response.ok, `Canary deletion failed (HTTP ${response.status})`);
const body = await response.text();
if (body.trim()) assert.equal(JSON.parse(body).success, true, "Cloudflare did not confirm canary deletion");
console.log(`Deleted ${name}.`);
