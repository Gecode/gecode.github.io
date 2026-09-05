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
cache policy; selected version routes and aliases have a five-minute policy.
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
Previously cached selected routes may remain visible for up to five minutes.
Rollback restores the previous `DOC_REVISIONS` entry (or removes it to select
historical objects), without changing stored documentation.

The Worker exposes the selected release's `sitemap.xml` at the stable
`/doc/sitemap.xml` URL advertised by `robots.txt`. It rewrites sitemap index
and shard responses to use only `/doc/latest/...` URLs. Stored immutable R2
sitemaps may retain versioned URLs; those artifacts are never submitted
directly and do not need to be republished when the indexing policy changes.
