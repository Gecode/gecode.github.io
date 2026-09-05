# Documentation publication tools

Publish a reviewed local tree directly into immutable R2 objects:

```sh
node scripts/docs/create-manifest.mjs \
  --root /path/to/docs --version 6.4.0 --output /path/to/manifest.json
node scripts/docs/publish-release.mjs \
  --root /path/to/docs --version 6.4.0 --revision 20260905-rst2 \
  --manifest /path/to/manifest.json --remote r2:gecode-documentation
```

For archives with many small files, optionally increase rclone concurrency
before running the publication command:

```sh
export RCLONE_TRANSFERS=32
export RCLONE_CHECKERS=32
```

These environment settings apply to rclone processes in that shell; the tools
do not change persistent defaults. An interrupted upload can resume with the same revision
and reviewed manifest: existing objects are verified before missing objects
are uploaded.

The second command validates the local tree and prints the destination. Add
`--confirm-upload` to upload, verify the remote objects, and write the completion
manifest. Publication does not change the worker's selected revision.

A revision uses `_revisions/<version>/<revision>/` for objects and
`_manifests/<version>/<revision>.json` for completion. Revision IDs must be a
single safe build identifier: letters, digits, periods, underscores, and
hyphens, beginning with a letter or digit, up to 128 characters. Omitting
`--revision` preserves the existing `<version>/` and `_manifests/<version>.json`
paths. Manifest keys and sitemap URLs continue to describe public
`/doc/<version>/...` URLs.

Verify a completed revision without uploading:

```sh
node scripts/docs/verify-version.mjs --version 6.4.0 --revision 20260905-rst2 \
  --manifest /path/to/manifest.json --remote r2:gecode-documentation --final
```

Manifests contain SHA-256 and MD5 hashes. For new MD5 manifests, remote
verification lists every object's path, size, and hash without requesting
per-object MIME or modification metadata. It then checks actual MIME metadata
for one representative of each expected content type. This avoids thousands of
serial HEAD requests while retaining complete path, size, and hash coverage.
Live deployment smoke checks also exercise the main served content types.

Historical SHA-256-only manifests retain per-object metadata checks. Objects
without comparable remote hashes use a targeted download fallback; historical
Graphviz image maps also require their existing content-format check. Normal
new publications do not download the tree.

Publication requires rclone 1.75 or newer. Every upload uses `If-None-Match: *`,
including the completion manifest, so a concurrent writer cannot overwrite an
object between the initial check and upload. Existing objects are verified and
skipped. Server-side copy is disabled, and uploads use a single PutObject;
individual objects must be smaller than 5 GiB. A different manifest cannot
replace a completed revision; choose a new revision ID.

The historical `publish-version.mjs`, `verify-version.mjs`, and
`promote-version.mjs` commands still support staging. Each accepts optional
`--revision`; its staging prefix becomes
`staging/<build-id>/<version>/<revision>/`. Without that option the original
staging paths remain unchanged. Promotion uses the same conditional upload
protection, streaming through the client instead of using S3 CopyObject. New
release automation should use `publish-release.mjs` directly.
