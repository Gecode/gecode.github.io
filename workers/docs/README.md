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

## Prepare a release

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

Promotion verifies the staged objects, copies them to the final immutable
prefix, verifies the final objects again, and stores the reviewed manifest at
`_manifests/<version>.json`. A final release can also be checked later by
downloading that manifest and replacing `--build-id ...` with `--final` in the
verification command.

## Provision and deploy

The bucket, DNS proxy, secrets, and billing alerts are intentionally not
created by this repository. Both Workers read the same private production
bucket; only their routes and selected `latest` versions differ. After an
operator creates the bucket named in `wrangler.jsonc` and the
`docs-staging.gecode.dev` Worker custom domain:

```sh
npx wrangler deploy --env="" --config workers/docs/wrangler.jsonc
npx wrangler deploy --env production --config workers/docs/wrangler.jsonc
```

After promotion, test the explicit immutable version through the proxied
`docs-staging.gecode.dev/doc/<version>/...` route before selecting it as
`latest`. Cloudflare's Cache API does not cache requests on `workers.dev`, so
that hostname cannot validate production cache behavior.
During the first production canary, keep the documentation in the GitHub Pages
artifact. Removing the documentation Worker routes then restores the current
origin without rebuilding the site.

To select a new release, change `LATEST_DOC_VERSION` in both Wrangler
environments, deploy staging, run smoke tests, and deploy production. Existing
alias responses can remain cached for at most five minutes; the promotion is
therefore bounded rather than instantaneous. Do not remove an older prefix.

The Worker exposes the selected release's `sitemap.xml` at the stable
`/doc/sitemap.xml` URL advertised by `robots.txt`. Sitemap shards and all page
URLs remain immutable, versioned `/doc/<version>/...` URLs; aliases are not
listed.
