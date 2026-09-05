# Gecode release documentation pipeline

This document defines the coordinated release path and documentation-only
updates for the Astro and Cloudflare website. The one-time migration and DNS
cutover are covered in
the [deployment runbook](deployment-runbook.md).

Release-support is the publication authority. It coordinates the Gecode
source release, *Modeling and Programming with Gecode* (MPG), this website,
and Cloudflare. It must publish and verify the documentation before the Gecode
GitHub release becomes public. A `release.published` event may run
post-publication checks, but it must not start the authoritative release.

This coordination is one-way. A Gecode release requires changes and deployment
work in the website repository, but an ordinary website change does not enter
the Gecode release process. The website is expected to deploy much more often
than Gecode releases.

## Ownership and release contract

The repositories have separate responsibilities:

- Gecode produces publication-ready Doxygen HTML and the matching tag file
  from the exact approved source revision.
- MPG produces its versioned modeling website and PDF from the exact approved
  MPG revision.
- Release-support pins both inputs, builds them once, assembles the combined
  tree, publishes it to R2, and coordinates public release operations.
- This website owns the documentation manifest and sitemap formats, the
  documentation Worker, and the Pages and Worker deployment workflows. It does
  not contain or rebuild generated documentation.

The release job assembles one clean directory:

```text
release-tree/
  index.html       documentation entry page
  reference/       Doxygen output
  modeling/        MPG website
  MPG.pdf           MPG PDF
```

The pinned Gecode and MPG versions, commits, and tool versions must agree with
the coordinated release state. Generated output must already be ready for its
final URL. Fix generators in their producer repositories; do not patch
Doxygen or MPG HTML in the ordinary release-support path.

## Build the producer artifacts once

The Gecode CMake build creates Doxygen output with:

```sh
cmake -S . -B build-docs
cmake --build build-docs --target doc
```

Copy `build-docs/doc/html/` to `release-tree/reference/`.

Use MPG's release packaging contract to create its versioned bundle. Copy the
packaged modeling site to `release-tree/modeling/` and the matching PDF to
`release-tree/MPG.pdf`. Validate MPG's own release manifest before assembling
the combined tree.

Release-support builds these artifacts from its pinned inputs. Producer CI may
validate the same inputs, but its output is not a second source of publication
bytes.

## Use a pinned website revision as tooling

Check out a reviewed commit of this repository as `website-tools`. Do not run
production release tooling from a moving branch. Use that checkout only to
create the page manifest, documentation sitemaps, and final manifest:

```sh
node website-tools/scripts/docs/create-manifest.mjs \
  --root release-tree --version "$VERSION" --output pages-manifest.json

node website-tools/scripts/docs/create-sitemaps.mjs \
  --manifest pages-manifest.json --output release-tree

node website-tools/scripts/docs/create-manifest.mjs \
  --root release-tree --version "$VERSION" --output manifest.json
```

Record the website-tool commit and final manifest digest in release state.
The final manifest contains SHA-256 and MD5 values. SHA-256 identifies the
approved local bytes; R2 verification normally compares MD5 from object
metadata. Do not describe the local SHA-256 values as hashes recomputed by R2.

Stored sitemap artifacts may contain version URLs. The Worker
rewrites the selected release's published sitemap index and shards to
`/doc/latest/...`; submit only `/doc/sitemap.xml`. Do not rewrite completed R2
objects to change indexing policy.

The ordinary release must not invoke this repository's historical Doxygen
patcher, staging publisher, staging verifier, or promotion scripts. Those
scripts may remain useful for the one-time migration of historical content,
but they are not the steady-state release contract.

## Publish the immutable tree to R2

Release-support owns the bucket-scoped R2 object credentials:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Configure rclone from environment variables instead of writing a credential
file to the runner:

```yaml
env:
  RCLONE_CONFIG_R2_TYPE: s3
  RCLONE_CONFIG_R2_PROVIDER: Cloudflare
  RCLONE_CONFIG_R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
  RCLONE_CONFIG_R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
  RCLONE_CONFIG_R2_ENDPOINT: https://${{ secrets.CLOUDFLARE_ACCOUNT_ID }}.r2.cloudflarestorage.com
  RCLONE_CONFIG_R2_NO_CHECK_BUCKET: "true"
```

The token needs object read/write access only to the documentation bucket. It
does not need DNS, Worker, or account-administration permissions. Cloudflare
does not provide a persistent bucket token that can upload without also being
able to list and delete objects, so protect and rotate this credential. Prefer
short-lived, prefix-scoped credentials if the workflow can mint them.

Choose a new revision ID for this exact combined tree. Copy it directly to
`_revisions/<version>/<revision>/` with the pinned publication tool:

```sh
node website-tools/scripts/docs/publish-release.mjs \
  --root release-tree --version "$VERSION" --revision "$REVISION" \
  --manifest manifest.json --remote r2:gecode-documentation --confirm-upload
```

For a tree with many small files, optional environment settings
`RCLONE_TRANSFERS=32` and `RCLONE_CHECKERS=32` increase upload and check
concurrency. They do not change publication semantics or persistent defaults.
An interrupted upload resumes with the same revision and reviewed manifest.

The tool validates the local manifest, checks any existing completion record,
and refuses conflicting existing objects. Matching partial uploads can resume;
matching completed revisions are verification-only. It does not make a
staging-to-final copy and never uses `sync` or deletes remote objects.

Every upload uses `If-None-Match: *`, including the completion record. This
requires rclone 1.75 or newer and protects against a concurrent writer after the
initial check. Server-side CopyObject is disabled because its destination
conditions differ from PutObject. Uploads use a single PUT; individual objects
must be smaller than 5 GiB.

For new MD5 manifests, remote verification uses a fast listing to compare the
complete relative-path set and every object's size and hash. It requests MIME
metadata for one representative of each expected content type, rather than
issuing a serial HEAD request for every file. Live deployment smoke checks also
exercise HTML, CSS, JavaScript, JSON, XML, and PDF responses. This is representative
MIME validation, not a claim to inspect every object's Content-Type header.

Normal R2 verification does not download the release tree. Historical manifests
without MD5 retain per-object metadata checks. Objects without comparable hashes
and historical image-map format checks use a targeted download fallback rather
than accepting a size-only result.

Only after verification succeeds, the tool conditionally writes
`_manifests/<version>/<revision>.json` and reads that exact object back. Record
the version, revision, object count, total bytes, final manifest digest, and
website-tool commit. Omitting `--revision` retains the historical `<version>/`
and `_manifests/<version>.json` layout; documentation updates must use new
revision IDs rather than alter those completed prefixes.

## Prepare the website candidate

Uploading immutable documentation does not select it as `latest`. Prepare a
website-only candidate from a pinned, current website `main`. For an ordinary
content release, the candidate updates:

- `src/data/site.ts`;
- the transitional `_data/versions.yaml` with equivalent values;
- the release news item, using immutable documentation URLs; and
- the production `DOC_REVISIONS[version]` selection and `LATEST_DOC_VERSION`.

Keep generated documentation and R2 credentials out of the candidate. Use
`/doc/latest/...` for human entry points, `/doc/<version>/...` for a version's
selected documentation, and `/doc/<version>/revisions/<revision>/...` when a
citation must identify immutable documentation bytes. Only the production latest URLs are indexable and
canonical. Version and explicit revision URLs, including PDFs, and the HTTP 200
`/doc-latest/...` compatibility alias carry `X-Robots-Tag: noindex`; staging
documentation is also `noindex`. Producer HTML must not contain conflicting
versioned canonical links; the Worker owns the served canonical selection.

Run the configured website quality command and validate the release,
download, and documentation pages. Before changing either alias, smoke-test
the new explicit `/doc/<version>/revisions/<revision>/...` routes through the
existing production Worker, including
reference HTML, modeling assets, `MPG.pdf` range requests, anchors, and 404s.

Publish the candidate with exact-base checks:

1. Update `release/<version>-website` from its recorded prior value to the
   approved candidate SHA.
2. Update `main` from the pinned current-main SHA to that candidate.
3. Accept only the Pages push run whose `headSha` is the approved candidate
   SHA, and wait for it to succeed.
4. Confirm that `release/<version>-website` still resolves to the approved
   candidate SHA.
5. Dispatch `workers.yml` from that exact branch with
   `operation=deploy`, `environment=production`, and
   `worker=documentation`.
6. Verify the Worker's run SHA, workflow identity, dispatch event, protected
   environment, and inputs.

Then verify both aliases and both selection headers:

```text
/doc/latest/reference/index.html
/doc-latest/reference/index.html
X-Gecode-Documentation-Version: <version>
X-Gecode-Documentation-Revision: <revision>
```

Also verify immutable and alias modeling assets, PDF range requests, a
documentation 404, ordinary Astro pages, and the release-news anchor. Selected version routes and alias caches may serve previous selections for up
to five minutes. Roll back by restoring the previous `DOC_REVISIONS` and, if
changed, `LATEST_DOC_VERSION`. Stored revisions remain unchanged.

Check indexing headers on HTML and PDFs: only production `/doc/latest/...`
may be indexed. Verify latest HTML canonicals and that the published sitemap
index and every shard contain only latest URLs, including after alias
promotion. Keep immutable and compatibility paths crawlable so crawlers can
observe their `noindex` headers.

Staging and canary Worker deployments belong to the initial migration or to a
Worker-code change. They are not required for an ordinary content-only
release.

## Update documentation without releasing Gecode

Use release-support's `scripts/documentation.py` commands to prepare the
combined tree from an existing reference build and a validated MPG package,
publish a new revision, verify its explicit preview route, and edit the
website's production selection. `select` edits configuration only; it does
not deploy, publish Gecode, publish MPG, change release news, or change
`LATEST_DOC_VERSION` unless `--latest` is explicitly requested.

Review and land the `DOC_REVISIONS` change on website `main`, then dispatch
`workers.yml` from `main` with `operation=deploy`, `environment=production`,
and `worker=documentation`. The documentation-only CLI does not create an
approved `docs/...-website` deployment branch. Production keeps its existing
`main` and normal `release/<version>-website` ref rules.

Verify the newly selected version and, if it is latest, both aliases:

```sh
node scripts/docs/smoke-worker.mjs https://www.gecode.dev "$VERSION" \
  --revision "$REVISION"
```

Add `--immutable-only` when updating a non-latest version. The deployment
workflow reads `DOC_REVISIONS`, checks both version and revision headers, and
also checks other selected versions so an old revision cannot pass merely
because the Gecode version is unchanged. HTML, modeling search assets,
reference CSS, sitemaps, exact PDF ranges, indexing policy, and 404s are part
of these checks.

## Keep website work independent

Normal website development and deployment continue while release-support
prepares a release. A website-only change follows the website's normal Pages
workflow: it needs no Gecode or MPG build, release-support state, R2
publication, alias change, or coordinated release approval. Do not reserve or
lock website `main`.

If `main` advances before the candidate lands, reject the stale expected-base
update. Refresh only the website input, reapply the deterministic release
metadata and Worker selection, rerun website validation, and obtain a new
publish approval when the approved website or alias operations changed. Do
not rebuild Gecode or MPG, republish R2 objects, or invalidate their approved
release state.

Once the approved candidate has reached `main` and its exact Pages run has
succeeded, later unrelated website commits do not invalidate that deployment
proof.

## Public release order

The coordinated release finishes in this order:

1. Publish and verify the immutable R2 documentation tree.
2. Land the exact website candidate and verify its Pages deployment.
3. Deploy the production documentation Worker from the exact candidate ref
   and verify the aliases.
4. Publish MPG.
5. Publish Gecode last.

Keep Worker deployment credentials in this website's protected Cloudflare
environment. Keep R2 object credentials in release-support. This separation
lets release-support publish immutable documentation without permission to
change production routing.
