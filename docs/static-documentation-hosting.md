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

The current documentation fits within R2's free tier: 10 GB-month of Standard
storage, one million Class A operations, and ten million Class B operations per
month. Standard storage above the allowance costs $0.015 per GB-month, and R2
does not charge for Internet egress. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

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

Do not store `doc/latest` or `doc-latest` copies. Configure the Worker with a
single `LATEST_DOC_VERSION` value and resolve both aliases to the selected
version. A request for `/doc/latest/reference/index.html` reads
`6.5.0/reference/index.html`. This avoids duplicate storage and makes
promotion a single configuration change. Alias caches converge within five
minutes; promotion is not instantaneous.

Treat immutable `/doc/<version>/...` URLs as canonical. HTML responses carry an
HTTP `Link` canonical for their versioned URL, including responses reached
through either alias. Allow crawlers to index versioned documentation, exclude
the aliases in `robots.txt`, and publish only versioned URLs in documentation
sitemaps.

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
11. Add an HTTP canonical link to versioned HTML responses.

Versioned objects can use a one-year shared cache because their keys never
change. Alias responses should use a five-minute cache and expose the resolved
version through a response header. Allow that bounded cache to converge after
promotion.

Keep the bucket private and disable its `r2.dev` endpoint. Bind the bucket to
the Worker rather than exposing it directly. Cloudflare recommends a custom
domain for production R2 traffic; the development endpoint is rate-limited.
See [R2 public access limits](https://developers.cloudflare.com/r2/platform/limits/).

## Publishing pipeline

Build and publish documentation from the repository that owns each source.
The Gecode release workflow should publish Doxygen output. The MPG workflow
should publish the new modeling manual. A small coordinator job can combine
their manifests before promoting a release.

Each producer should perform these steps:

1. Generate its documentation into a clean directory.
2. Reject symbolic links, absolute links to build paths, and files outside the
   expected product prefix.
3. Record the file count, total bytes, MIME type, SHA-256 digest, and relative
   path in a manifest.
4. Validate internal links against the combined release tree.
5. Split generated sitemaps at 45,000 URLs, below the protocol limit of 50,000
   URLs or 50 MB, and write a sitemap index. See
   [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
6. Upload to `staging/<build-id>/` with a narrowly scoped R2 token.
7. Compare the remote object count and manifest with the local build.
8. Smoke-test representative HTML, CSS, JavaScript, image, source, and PDF
   objects through the Worker.
9. Copy the verified objects to a new immutable `<version>/` prefix.
10. Update `LATEST_DOC_VERSION`, deploy the Worker, rerun the alias smoke
    tests, and allow the bounded five-minute alias cache to converge.

The Gecode source repository should own this release job because it owns the
Doxygen configuration and the modeling-manual generator. On a GitHub release,
its protected documentation job should assemble the complete version tree and
call the tools in this repository. The website repository continues to own the
Worker code and routes. Give the release job write access only to R2; keep the
production Worker deployment and `latest` selection in a separately protected
environment. The concrete job contract and command sequence are in
[Gecode release documentation pipeline](gecode-release-pipeline.md).

Both the staging and production Workers read the same private bucket. Staged
objects remain unreachable below `staging/`. After verification and promotion,
the staging Worker smoke-tests the explicit immutable `/doc/<version>/` path.
Only then does the production deployment select that version as `latest`.

Use `rclone` for bulk transfer. Cloudflare recommends it for directory uploads,
whereas Wrangler uploads one object at a time. See
[R2 upload methods](https://developers.cloudflare.com/r2/objects/upload-objects/).
Use `copy`, not `sync`, for immutable release prefixes; an incorrect `sync`
could delete valid release objects.

Give each publishing workflow an upload-only token for its staging and release
prefixes. Store credentials as environment-scoped GitHub Actions secrets.
Keep production promotion in a protected environment with manual approval
until several releases have completed successfully.

## Migration sequence

The local implementation now includes the tested Worker in `workers/docs/`,
manifest, inventory, and sitemap generators in `scripts/docs/`, an immutable
staged `rclone` publisher with SHA-256 verification, and CI validation.
Generated sitemap files are part of each immutable release, and the Worker
serves the selected sitemap at `/doc/sitemap.xml`. Provisioning buckets and
credentials, uploading objects, and changing DNS remain operator actions
because they affect external infrastructure.

### Phase 1: inventory and prototype

- Generate a manifest for every tracked object below `doc/`.
- Record existing symlinks and resolve `doc/latest` and `doc-latest` as aliases.
- Measure file counts and bytes by version, extension, and documentation product.
- Create the private documentation bucket and deploy the read-only staging
  Worker at `docs-staging.gecode.dev`.
- Upload Gecode 6.4.0 and test directory indexes, fragments, source pages,
  downloads, ranges, MIME types, caching, and 404s.

Exit criterion: the staging host passes automated link checks and browser tests
against the local archive.

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
- Proxy the `www` record while retaining its GitHub Pages CNAME origin.
- Install Worker routes for `www.gecode.dev/doc/*` and
  `www.gecode.dev/doc-latest/*`.
- Test the routes with a canary prefix before enabling the full patterns.
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
- Update website links to versioned documentation URLs. Keep `latest` for human
  entry points, not for citations or release notes.

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
- branded 404s with no accidental bucket listing;
- sitemap size and URL-count limits;
- ordinary `www.gecode.dev` pages bypassing the documentation Worker.

Monitor R2 storage, Class A writes, Class B reads, Worker errors, cache hit rate,
and documentation 404s. Set billing alerts before enabling production traffic.

## Rollback

Keep the current GitHub Pages documentation artifact available during the
canary period. If the Worker or R2 path fails, remove the two Worker routes and
turn the `www` record back to DNS-only service. GitHub Pages will resume serving
the checked-in documentation without a content rebuild.

After the repository cleanup, rollback means restoring the Worker route to the
previous version or reverting `LATEST_DOC_VERSION`. Since release prefixes are
immutable, both operations avoid data restoration.

## Follow-up issues

Create separate implementation issues for:

1. R2 bucket, token, DNS, and billing-alert setup.
2. Worker routing, cache, MIME, range, and security behavior.
3. Historical manifest generation and upload.
4. Documentation link and browser regression tests.
5. Doxygen release publishing.
6. MPG HTML release publishing and sitemap partitioning.
7. Production route canary and DNS cutover.
8. Removal of generated archives from GitHub Pages and this repository.
