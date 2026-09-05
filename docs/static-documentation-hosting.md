# Static documentation hosting plan

## Decision

Move generated Gecode documentation to a private Cloudflare R2 bucket and
serve it through a small Cloudflare Worker. Keep the Astro website on GitHub
Pages.

Use R2 rather than Cloudflare Pages or Workers Static Assets. The generated
documentation already contains more than 52,000 files, and the new web edition
of *Modeling and Programming with Gecode* will add many source-view pages.
Workers Static Assets accepts 20,000 files on the free plan and 100,000 on the
paid plan. R2 places no limit on the number of objects in a bucket. See the
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
and [R2 limits](https://developers.cloudflare.com/r2/platform/limits/).

The current archive contains 52,368 files and 1.131 GB of object data. It fits
within R2's free tier: 10 GB-month of Standard storage, one million Class A
operations, and ten million Class B operations per month. Standard storage
above the allowance costs $0.015 per GB-month, and R2 does not charge for
Internet egress. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Workers Free allows 100,000 requests per UTC day across the account. Worker
cache hits still count. Workers Paid starts at $5 per month and includes ten
million monthly requests; it is the likely first paid upgrade if traffic grows.
The active Astro site remains free on GitHub Pages.

## Target architecture

```text
www.gecode.dev/*                  GitHub Pages (Astro)
www.gecode.dev/doc/*              Cloudflare Worker route
www.gecode.dev/doc-latest/*       Cloudflare Worker route
                                      |
                                      v
                              private R2 bucket
```

Put the `www.gecode.dev` DNS record behind Cloudflare and attach Worker routes
only to the two documentation prefixes. Unmatched requests continue to the
GitHub Pages origin. This keeps the website on GitHub Pages and preserves every
existing documentation URL.

Moving authoritative DNS away from Namecheap disables Namecheap's free email
forwarding even if its old MX records are copied. Configure Cloudflare Email
Routing, verify its destinations, and recreate every alias before delegation.
After the zone becomes active, test every alias before enabling Worker routes.
See Namecheap's [custom-nameserver
warning](https://www.namecheap.com/support/api/methods/domains-dns/set-custom/)
and Cloudflare's [Email Routing
pricing](https://developers.cloudflare.com/email-service/platform/pricing/).

If proxying the GitHub Pages hostname proves unreliable, use
`docs.gecode.dev` as the Worker custom domain and leave small HTML redirects at
the old `www.gecode.dev/doc/...` URLs. This fallback preserves HTML deep links
but cannot redirect arbitrary CSS, source, archive, or PDF paths without one
stub per object. The path-routed design is therefore the preferred result.

Cloudflare documents Worker routes as a proxy layer in front of an existing
origin and supports path patterns such as `example.com/path*`. See
[Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/).

## Object layout

Mirror the public URL below the bucket root. Do not encode release state in
bucket names.

```text
1.3.1/
  reference/...
  MPG.pdf
6.4.0/
  reference/...
  MPG.pdf
6.5.0/
  reference/...
  modeling/...
  MPG.pdf
_manifests/
  6.4.0.json
  6.5.0.json
staging/
  <build-id>/...
```

Use stable subdirectories for each documentation product:

- `reference/` for Doxygen API and changelog pages;
- `modeling/` for the new HTML modeling and programming manual;
- `MPG.pdf` for the PDF manual while it remains available.

Treat versioned prefixes as immutable. A release pipeline may create a new
prefix, but it must never replace an existing prefix silently.

Expire keys below `staging/` after 14 days with an R2 lifecycle rule. Staging
trees help diagnose a recent failed publication but must not accumulate. Never
apply expiration or storage-tier transitions to versioned prefixes.
See [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

Do not store `doc/latest` or `doc-latest` copies. Configure the Worker with a
single `LATEST_DOC_VERSION` value and resolve both aliases to the selected
version. A request for `/doc/latest/reference/index.html` reads
`6.5.0/reference/index.html`. This avoids duplicate storage and makes
promotion a single configuration change. Alias caches converge within five
minutes; promotion is not instantaneous.

Only production `/doc/latest/...` documentation is indexable. Its HTML uses
the corresponding latest URL as its canonical. Every immutable
`/doc/<version>/...` response, including PDFs, carries `X-Robots-Tag: noindex`.
The `/doc-latest/...` compatibility alias continues to serve content with HTTP
200 and `noindex`; all staging documentation also carries `noindex`.
Keep these paths crawlable so search engines can read the indexing headers.

Submit `/doc/sitemap.xml`, which exposes the selected release using only
`/doc/latest/...` sitemap and page URLs. The Worker rewrites stored sitemap
URLs in its responses; immutable R2 sitemap artifacts remain unchanged and
are never submitted as versioned sitemaps.

## Worker behavior

The Worker should implement only the behavior object storage lacks:

1. Accept `GET` and `HEAD`; reject other methods.
2. Normalize the URL and reject `..`, repeated decoding, and malformed paths.
3. Rewrite `doc/latest/` and `doc-latest/` to the configured release.
4. Append `index.html` when a URL ends in `/`.
5. Read the exact object through an R2 binding.
6. Return stored `Content-Type`, `Content-Length`, `ETag`, and modification
   metadata.
7. Support byte ranges so large PDFs and archives return `206 Partial Content`.
8. Return a small branded 404 page without trying extension fallbacks.
9. Add `X-Content-Type-Options: nosniff` and a conservative referrer policy.
10. Emit structured logs for misses, range failures, and unexpected methods.
11. Apply latest-only canonical and indexing headers to HTML, PDFs, and other
    documentation responses; rewrite published sitemap URLs to `/doc/latest/`.

Versioned objects can use a one-year shared cache because their keys never
change. Alias responses should use a five-minute cache and expose the resolved
version through a response header. Allow that bounded cache to converge after
promotion.

Ordinary uncached GETs should use one R2 `get()` operation. Use `head()` only
for HEAD and range handling, where the object size is needed before composing
the response.

Keep the bucket private and disable its `r2.dev` endpoint. Bind the bucket to
the Worker rather than exposing it directly. Cloudflare recommends a custom
domain for production R2 traffic; the development endpoint is rate-limited.
See [R2 public access limits](https://developers.cloudflare.com/r2/platform/limits/).

## Publishing pipeline

The authoritative steady-state contract is
[Gecode release documentation pipeline](gecode-release-pipeline.md).
Release-support pins Gecode, MPG and website tooling, builds the producer
artifacts once, assembles `reference/`, `modeling/` and `MPG.pdf`, and publishes
the immutable R2 tree before either public release. Producer repositories own
the generators; the website owns the Worker and deployment workflow.

Ordinary releases upload directly to the final unused version prefix with
`rclone copy`, verify the complete path set, sizes and MD5 hashes, and then
write the completion manifest. They do not use the historical staged publisher
or download the complete tree again. Existing completed versions are immutable,
including their file set. Keep one publisher per version. Check existing
completion records before any writes and use a conditional create for the
manifest; `rclone copyto --immutable` is not a no-overwrite guarantee.

Release-support owns bucket-scoped object credentials. Protected website
operations own Worker deployment and `latest` selection. Verify immutable URLs
before changing either alias. Staging and canary deployments are for migration
and Worker-code changes, not ordinary content releases. Alias caches converge
within five minutes. Publish MPG and then Gecode only after the website and
aliases are verified.

The coordinator implementation is tracked in release-support's `.zdev/cf`
tasks and is not yet production-ready. The historical commands in the Worker
README remain available for archive repair and migration only.

## Migration sequence

The local implementation now includes the tested Worker in `workers/docs/`,
manifest, inventory, and sitemap generators in `scripts/docs/`, an immutable
staged `rclone` publisher with SHA-256 verification, and CI validation.
Generated sitemap files are part of each immutable release, and the Worker
serves the selected sitemap at `/doc/sitemap.xml`, rewriting its URLs to
`/doc/latest/...` without modifying stored objects. Provisioning buckets and
credentials, uploading objects, and changing DNS remain operator actions
because they affect external infrastructure.

### Phase 1: inventory and prototype

- Generate a manifest for every tracked object below `doc/`.
- Record existing symlinks and resolve `doc/latest` and `doc-latest` as aliases.
- Measure file counts and bytes by version, extension, and documentation product.
- Create the private documentation bucket, add the `staging/` lifecycle rule,
  and deploy the staging Worker at `docs-staging.gecode.dev`. The Worker code is
  read-only, although Wrangler cannot enforce a read-only R2 binding.
- Upload Gecode 6.4.0 and test directory indexes, fragments, source pages,
  downloads, ranges, MIME types, and 404s locally. Run cache tests on the
  staging custom domain after the Cloudflare zone becomes active.

Exit criterion: manifests, local Worker tests, and direct remote verification
pass, and the staging custom domain is ready for testing after DNS delegation.

### Phase 2: migrate historical releases

- Upload each versioned directory without the symlink aliases.
- Verify each remote manifest independently.
- Verify every version's sitemap index and shards after upload.
- Run a sample of historical links from website content, repository READMEs,
  release notes, and search results.

Exit criterion: every tracked historical object is present under the same
versioned key in R2.

### Phase 3: preserve production URLs

- Move `gecode.dev` DNS to Cloudflare if necessary.
- Replace Namecheap forwarding with Cloudflare Email Routing and verify every
  alias immediately after delegation.
- Proxy the `www` record while retaining its GitHub Pages CNAME origin.
- Test the staging custom domain, then deploy the checked-in canary environment.
- After the canary passes, install the production routes for
  `www.gecode.dev/doc/*` and `www.gecode.dev/doc-latest/*`.
- Remove the canary after the production smoke test so its more-specific route
  no longer intercepts the selected version.
- Compare status, body digest, MIME type, cache headers, and range behavior
  between the old and new origins.

Exit criterion: existing documentation URLs serve identical content from R2,
while ordinary website URLs still come from GitHub Pages.

### Phase 4: shrink the Pages deployment

- Publish with `npm run build:pages`; this excludes `doc/` and `doc-latest`
  while preserving the mailing-list archive.
- Remove `scripts/copy-archives.mjs` after deciding whether the mailing-list
  archive will also move to R2.
- Delete generated documentation from the website repository in a normal
  commit. Keep a tagged pre-migration commit for provenance.
- Consider a separate, carefully announced history rewrite only if clone size
  remains a problem; it is not required for serving the site.
- Use `/doc/latest/...` for website documentation entry points. Keep immutable
  version URLs for citations and release notes; those URLs remain available
  but are not indexable.

Exit criterion: the GitHub Pages artifact contains only the Astro site and
small first-party downloads.

### Phase 5: publish the expanded modeling manual

- Add the `modeling/` producer to the release manifest contract.
- Load-test a release with the projected source-view page count.
- Verify that sitemap partitioning, upload time, cache behavior, and link
  validation remain bounded as page count grows.
- Promote the first combined release through the same immutable-version process.

Exit criterion: Doxygen and MPG publish independently but appear atomically
under one versioned documentation tree.

## Tests and operational checks

Automate these checks before changing DNS:

- manifest equality: path, size, SHA-256, and MIME type;
- zero unexpected missing or extra objects;
- no symbolic links in generated output;
- internal link validation over each product and the combined release;
- desktop and mobile rendering of the changelog and modeling manual;
- deep fragment navigation after `latest` resolution;
- directory index behavior;
- `GET`, `HEAD`, conditional requests, and byte ranges;
- cache headers for versioned and alias paths;
- latest-only indexing and canonical URLs, with `noindex` on immutable URLs,
  PDFs under those URLs, the compatibility alias, and staging;
- branded 404s with no accidental bucket listing;
- sitemap size and URL-count limits, with only latest URLs in the submitted
  sitemap index and shards;
- ordinary `www.gecode.dev` pages bypassing the documentation Worker.

Set documentation routes to fail closed after the Pages archive is removed;
fail-open requests would reach a missing origin path. Set redirect routes to
fail open because the Pages artifact contains fallback redirect files.

Monitor R2 storage, Class A writes, Class B reads, Worker errors, cache hit rate,
documentation 404s and 503s, GitHub Pages availability, and Email Routing
failures. Check Worker usage daily during cutover and weekly afterward. Workers
Free allows 100,000 requests per UTC day across the account, including cache
hits. Use 70,000 and 90,000 requests as warning thresholds and move to Workers
Paid before ordinary traffic approaches the limit. Set billing notifications
before enabling production traffic.

Keep manifests and a recoverable source or release artifact for every version.
Immutable prefixes simplify rollback but do not protect against account loss or
a bucket-wide deletion.

## Rollback

Keep the current GitHub Pages documentation artifact available during the
canary period. If the Worker or R2 path fails, remove the documentation route
set and turn the `www` record back to DNS-only service. GitHub Pages will resume
serving the checked-in documentation without a content rebuild.

If DNS or Cloudflare Email Routing fails during delegation, restore Namecheap's
nameservers; copying the old forwarding MX records into Cloudflare is not a
working mail rollback.

After the repository cleanup, rollback means restoring the Worker route to the
previous version or reverting `LATEST_DOC_VERSION`. Since release prefixes are
immutable, both operations avoid data restoration.

## Follow-up issues

Create separate implementation issues for:

1. R2 bucket, lifecycle rule, token, DNS, Email Routing, and billing-alert setup.
2. Worker routing, cache, MIME, range, and security behavior.
3. Historical manifest generation and upload.
4. Documentation link and browser regression tests.
5. Doxygen release publishing.
6. MPG HTML release publishing and sitemap partitioning.
7. Production route canary and DNS cutover.
8. Removal of generated archives from GitHub Pages and this repository.
