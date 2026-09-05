# Documentation Worker

This Worker serves Gecode's generated documentation from a private Cloudflare
R2 bucket while preserving the existing `www.gecode.dev` paths. It does not
serve the Astro website.

The bucket stores releases at its root:

```text
6.4.0/reference/index.html
6.4.0/MPG.pdf
6.5.0/modeling/index.html
```

The Worker maps `/doc/<version>/...` directly to those keys. It maps both
`/doc/latest/...` and `/doc-latest/...` to `LATEST_DOC_VERSION`; aliases are not
copied into R2. HTML responses include an HTTP `Link` canonical that points to
the immutable versioned URL. Search engines may index versioned documentation;
`robots.txt` excludes both aliases to avoid duplicate indexing.

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

## Historical migration publisher

For ordinary releases, follow [the release contract](../../docs/gecode-release-pipeline.md).
The commands below are historical migration tools, not the coordinated release
path. Run only one publisher for any version. Promotion requires rclone 1.75.0
or newer for conditional R2 manifest writes.

Bulk uploads use `rclone`, which is better suited to tens of thousands of
objects than one-object-at-a-time Wrangler uploads. The publishing command is
a dry run unless `--confirm-upload` is present:

```sh
node scripts/docs/publish-version.mjs \
  --root release-tree \
  --version 6.4.0 \
  --manifest .documentation-manifests/6.4.0.json \
  --build-id local-6.4.0 \
  --remote r2:gecode-documentation
```

The command first proves that the source still matches the manifest, then uses
`copy --immutable` to upload into `staging/<build-id>/<version>`. It neither
overwrites an existing object nor deletes remote objects. Configure the named
`r2` remote with an R2 token limited to the documentation bucket.

After uploading, compare every local file with the remote release:

```sh
node scripts/docs/verify-version.mjs \
  --version 6.4.0 \
  --manifest .documentation-manifests/6.4.0.json \
  --build-id local-6.4.0 \
  --remote r2:gecode-documentation
```

This downloads the staged tree and recomputes its SHA-256 manifest. The check
fails on a missing, extra, or changed object. Promote only after it succeeds:

```sh
node scripts/docs/promote-version.mjs \
  --version 6.4.0 \
  --manifest .documentation-manifests/6.4.0.json \
  --build-id local-6.4.0 \
  --remote r2:gecode-documentation \
  --confirm-promotion
```

Promotion first rejects a conflicting completion manifest. An identical
completed release is verified without requiring staging or writing objects.
For an unfinished release it verifies staged content and any matching partial
final tree before copying, then verifies the final tree and conditionally
creates `_manifests/<version>.json`. The readback must match exactly. It never
extends a completed version or replaces an existing completion manifest. A final release can also be checked later by
downloading that manifest and replacing `--build-id ...` with `--final` in the
verification command.

## Provision and deploy

The bucket, lifecycle rule, DNS proxy, Email Routing, secrets, and billing
alerts are intentionally not created by this repository. The staging, canary,
and production Workers read the same private production bucket; only their
routes and selected `latest` versions differ. Configure the bucket to expire
`staging/` keys after 14 days. After an
operator creates the bucket named in `wrangler.jsonc` and the
`docs-staging.gecode.dev` Worker custom domain:

```sh
npx wrangler deploy --env="" --config workers/docs/wrangler.jsonc
npx wrangler deploy --env canary --config workers/docs/wrangler.jsonc
npx wrangler deploy --env production --config workers/docs/wrangler.jsonc
```

The checked-in canary environment owns only the current immutable version
route, such as `/doc/6.4.0/*`. Update both the route and
`LATEST_DOC_VERSION` before each canary deployment. Do not create a temporary
dashboard route: a later Wrangler deployment would replace it. Remove the
canary after the production smoke test because its more-specific route takes
precedence over the production `/doc/*` route:

```sh
npx wrangler delete --env canary --config workers/docs/wrangler.jsonc --force
```

The `Deploy edge workers` workflow exposes the same action as
`remove-canary`. Select the `canary` environment and `documentation` Worker
when deploying or removing the canary.

After promotion, test the explicit immutable version through the proxied
`docs-staging.gecode.dev/doc/<version>/...` route before selecting it as
`latest`. Cloudflare's Cache API does not cache requests on `workers.dev`, so
that hostname cannot validate production cache behavior.
During the first production canary, keep the documentation in the GitHub Pages
artifact. Removing the documentation Worker routes then restores the current
origin without rebuilding the site.

For a Worker-code change, validate staging before production. For an ordinary
content release, verify the immutable version through the existing production
Worker, then deploy its approved production `LATEST_DOC_VERSION` selection as
described in the release contract. Existing alias responses can remain cached for at most five minutes; the promotion is
therefore bounded rather than instantaneous. Do not remove an older prefix.

The Worker exposes the selected release's `sitemap.xml` at the stable
`/doc/sitemap.xml` URL advertised by `robots.txt`. Sitemap shards and all page
URLs remain immutable, versioned `/doc/<version>/...` URLs; aliases are not
listed.
