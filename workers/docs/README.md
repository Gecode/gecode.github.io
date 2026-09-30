# Documentation Worker

This Worker serves Gecode's generated documentation from a private Cloudflare
R2 bucket while preserving the existing `www.gecode.dev` paths. It does not
serve the Astro website.

The bucket retains historical versions and adds immutable documentation revisions:

```text
6.4.0/reference/index.html                         # historical publication
_revisions/6.4.0/20260905-rst2/reference/index.html
_revisions/6.4.0/20260905-rst2/modeling/index.html
_revisions/6.4.0/20260905-rst2/MPG.pdf
_manifests/6.4.0/20260905-rst2.json                  # completion record
```

`DOC_REVISIONS` is a JSON string mapping Gecode versions to published revision
IDs, for example `{"6.4.0":"20260905-rst2"}`. The Worker resolves
`/doc/6.4.0/...` through that selection. An absent entry uses the historical
`6.4.0/...` prefix. Both `/doc/latest/...` and `/doc-latest/...` first resolve
`LATEST_DOC_VERSION`, then its selected revision. No aliases are copied into R2.

The explicit `/doc/6.4.0/revisions/20260905-rst2/...` route always addresses that
revision, independently of `DOC_REVISIONS`. Verify it before selecting a newly
published revision. Only this explicit revision route has a one-year immutable
browser cache policy; selected version routes and aliases have a five-minute
browser policy and a thirty-day edge policy.
Responses identify both choices with `X-Gecode-Documentation-Version` and
`X-Gecode-Documentation-Revision` (the latter is `legacy` for an unselected
historical prefix).

Only production `/doc/latest/...` documentation is indexable. HTML and PDF
responses there have a canonical Link header for the corresponding latest URL.
Version routes, explicit revision routes, the HTTP 200 `/doc-latest/...`
compatibility alias, and staging documentation carry `X-Robots-Tag: noindex`.
These paths remain crawlable so search engines can read the indexing headers.

Production routes use `doc*` and `robots.txt*` because Cloudflare matches query
strings against route patterns. Requests outside the exact documentation
namespaces, such as `/documentation.html`, pass through to the production
origin without documentation indexing headers. Unknown staging paths return
404, avoiding a fetch back into the custom-domain Worker. The `/doc` landing
redirect uses `/documentation.html`, which exists before and after Astro.

## Response caching

The checked-in configuration enables [Workers Cache](https://developers.cloudflare.com/workers/cache/).
Cloudflare checks this cache before executing the Worker and stores the final
response, including indexing headers and analytics injection. The Worker no
longer uses `caches.default`. Cache hits avoid execution and R2 reads, but still
count as billable Worker requests and against the Free request allowance.

`Cloudflare-CDN-Cache-Control` separates edge freshness from browser freshness:

| Response | Browser freshness | Edge freshness | Stale while revalidating |
| --- | --- | --- | --- |
| Latest, compatibility alias, selected version, redirects | 5 minutes | 30 days | 7 days |
| Explicit revision | 1 year, immutable | 1 year | 7 days |
| Selected sitemap and robots.txt | 5 minutes | 1 day | 1 day |
| 404 | No storage | 5 minutes | None |

Successful responses also allow stale delivery for thirty days on an origin
error. Other errors are not stored. Neighboring website paths bypass Workers
Cache and retain their origin's browser policy. Use `max-age`, not `s-maxage`,
in the edge header: [Workers Cache disables stale serving with `s-maxage`](https://developers.cloudflare.com/workers/cache/configuration/).

`cross_version_cache: false` isolates each Worker deployment's cache. Promoting
or rolling back a revision requires deploying the changed configuration; the
new deployment does not reuse the previous deployment's cached aliases. Browser
copies can remain fresh for five minutes. Immutable R2 objects must never be
overwritten. Cache lifetime is not a retention guarantee: eviction and distinct
query strings can still cause misses.

Before the first production rollout, validate this configuration on staging:

Staging note (30 September 2026): native Workers Cache returns 206 for HEAD
requests carrying Range. The existing smoke check expects 200, matching the
handler's behavior, and currently blocks promotion. Plain HEAD, GET ranges,
and stale If-Range checks pass. Cloudflare does not allow a Request Header
Transform Rule to remove Range. Keep the smoke assertion until the deployment
contract explicitly accepts this edge behavior.

1. Check repeated GETs for cache hits and confirm only misses execute the Worker
   using Workers Cache metrics and execution logs. Zone cache statistics alone
   do not establish the execution avoidance rate.
2. Check cold and warm HEAD, PDF ranges, redirects, canonical headers, sitemaps,
   and errors. Local tests call the handler directly, not the pre-Worker cache.
3. Exercise SWR with a temporary short staging TTL, then restore the configured
   policy. Verify a deployment changing the selected revision serves new content
   and that rollback restores the previous selection.
4. Run the existing smoke checks before promoting through the protected workflow.

## Local validation

Run all Worker integration tests and compile the production configuration:

```sh
npm run test:docs-worker
npm run check:docs-worker
```

The tests use a local R2 implementation. They do not require Cloudflare
credentials and do not make network requests.

## Prepare a manifest

Assemble a clean release tree, create its page inventory, write the sitemap
index and shards into that tree, and then create the immutable publication
manifest:

```sh
mkdir -p .documentation-manifests
node scripts/docs/create-manifest.mjs \
  --root release-tree \
  --version 6.4.0 \
  --output .documentation-manifests/6.4.0-pages.json

node scripts/docs/create-sitemaps.mjs \
  --manifest .documentation-manifests/6.4.0-pages.json \
  --output release-tree

node scripts/docs/create-manifest.mjs \
  --root release-tree \
  --version 6.4.0 \
  --output .documentation-manifests/6.4.0.json
```

The manifest command refuses symbolic links. This is why it must receive a
clean release directory, never `doc/latest` or `doc-latest`. The second
manifest includes `sitemap.xml` and its shards, so publication and later
verification cannot omit them.

## Publish a documentation revision

Follow [the release contract](../../docs/gecode-release-pipeline.md) for
coordinated releases and documentation-only updates. The pinned website tool
uploads a reviewed local tree directly to its final immutable prefix:

```sh
node scripts/docs/publish-release.mjs \
  --root release-tree --version 6.4.0 --revision 20260905-rst2 \
  --manifest .documentation-manifests/6.4.0.json \
  --remote r2:gecode-documentation --confirm-upload
```

Omit `--confirm-upload` to validate the local tree and print the destination
without uploading. Every write, including the completion manifest, uses a
conditional PutObject. The tool requires rclone 1.75 or newer, disables
server-side copy, and rejects individual objects of 5 GiB or larger. Existing
objects must match; completed revisions cannot be extended or replaced.

New manifests include SHA-256 and MD5. Remote verification checks every object's
path, size, and comparable hash through a fast listing, then checks MIME metadata
for one representative of each expected content type. It does not download the
normal release tree or issue a HEAD request for every file. Deployment smoke
checks exercise the main served types as well. Historical SHA-256-only manifests
retain per-object metadata checks and use targeted downloads when hashes are
unavailable. The completion manifest is written only after verification.

Verify the stored revision with:

```sh
node scripts/docs/verify-version.mjs --version 6.4.0 --revision 20260905-rst2 \
  --manifest .documentation-manifests/6.4.0.json \
  --remote r2:gecode-documentation --final
```

Publication does not update `DOC_REVISIONS` or deploy a Worker. The optional
staging commands remain available for historical migrations; see the
[publication tools](../../scripts/docs/README.md) for their compatible revision
and legacy-prefix modes.

## Provision and deploy

The bucket, lifecycle rule, DNS proxy, Email Routing, secrets, and billing
alerts are intentionally not created by this repository. The staging, canary,
and production Workers read the same private production bucket; only their
routes, selected revisions, and `latest` versions differ. Configure the bucket to expire
`staging/` keys after 14 days. After an
operator creates the bucket named in `wrangler.jsonc` and the
`docs-staging.gecode.dev` Worker custom domain:

```sh
npx wrangler deploy --env="" --config workers/docs/wrangler.jsonc
npx wrangler deploy --env canary --config workers/docs/wrangler.jsonc
npx wrangler deploy --env production --config workers/docs/wrangler.jsonc
```

The checked-in canary environment owns only the current selected version
route, such as `/doc/6.4.0/*`. Update the route,
`LATEST_DOC_VERSION`, and that environment's `DOC_REVISIONS` before each canary deployment. Do not create a temporary
dashboard route: a later Wrangler deployment would replace it. Remove the
canary after the production smoke test because its more-specific route takes
precedence over the production `/doc/*` route:

```sh
npx wrangler delete --env canary --config workers/docs/wrangler.jsonc --force
```

The `Deploy edge workers` workflow exposes the same action as
`remove-canary`. Select the `canary` environment and `documentation` Worker
when deploying or removing the canary.

After publication, verify the explicit revision route before changing its
selection. For a Worker-code change, validate staging before production. For
an ordinary content update, change the approved production `DOC_REVISIONS`
entry, and change `LATEST_DOC_VERSION` only when releasing a new Gecode
version. Deploy through the protected `Deploy edge workers` workflow from
`main` or the approved normal-release website branch; it does not accept a
separate documentation-only branch pattern.

The workflow reads the environment's configured revisions and checks the
latest version plus every other selected version. Its smoke command can also
be run directly after deployment:

```sh
node scripts/docs/smoke-worker.mjs https://www.gecode.dev 6.4.0 \
  --revision 20260905-rst2
```

For a selected version that is not latest, add `--immutable-only` to skip
latest aliases. Revision checks cover the modeling entry page, Pagefind index
and runtime assets, reference HTML, sitemap headers, exact PDF ranges, and 404s.
Previously browser-cached selected routes may remain visible for up to five minutes.
Rollback restores the previous `DOC_REVISIONS` entry (or removes it to select
historical objects), without changing stored documentation.

The Worker exposes the selected release's `sitemap.xml` at the stable
`/doc/sitemap.xml` URL advertised by `robots.txt`. It rewrites sitemap index
and shard responses to use only `/doc/latest/...` URLs. Stored immutable R2
sitemaps may retain versioned URLs; those artifacts are never submitted
directly and do not need to be republished when the indexing policy changes.
