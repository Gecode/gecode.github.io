# Gecode release documentation pipeline

The Gecode source repository should build and publish documentation as part of
its GitHub release workflow. This website repository supplies the publication
tools and owns the serving Worker; it should not rebuild documentation from
vendored output.

## Release contract

A release job must assemble one clean directory with this shape:

```text
release-tree/
  reference/       Doxygen output
  modeling/        Modeling and Programming HTML output
  MPG.pdf           PDF manual, while published
```

The job derives the version from the release tag and rejects a mismatch with
the generated Gecode version. Each producer may build independently, but the
job publishes only after the combined tree passes internal-link validation.

The current CMake build creates Doxygen output with:

```sh
cmake -S . -B build-docs
cmake --build build-docs --target doc
```

Its output is `build-docs/doc/html/`, which becomes `release-tree/reference/`.
Add the modeling-manual generator as a second producer when its command and
output contract stabilize.

## GitHub job boundary

Run publication on the `release.published` event in a protected
`documentation-production` environment. The job should:

1. Check out the exact release tag.
2. Build Doxygen and the HTML modeling manual.
3. Assemble and validate `release-tree/`.
4. Check out a pinned revision of this website repository as tooling.
5. Run the generated-HTML compatibility patch and validate its output.
6. Create the SHA-256 manifest and documentation sitemaps.
7. Upload to `staging/<run-id>/<version>` in R2.
8. Re-download the entire staged tree and verify its manifest and MIME types.
9. Promote it to the immutable `<version>/` prefix.
10. Re-download and verify the promoted tree.
11. Persist the reviewed manifest at `_manifests/<version>.json`.

Steps 5–10 are implemented by `scripts/docs/`. The upload and promotion
commands require separate confirmation flags, so a malformed build cannot
reach the final prefix through an omitted default.

Use these GitHub environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Configure rclone from environment variables rather than writing a credential
file to the runner:

```yaml
env:
  RCLONE_CONFIG_R2_TYPE: s3
  RCLONE_CONFIG_R2_PROVIDER: Cloudflare
  RCLONE_CONFIG_R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
  RCLONE_CONFIG_R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
  RCLONE_CONFIG_R2_ENDPOINT: https://${{ secrets.CLOUDFLARE_ACCOUNT_ID }}.r2.cloudflarestorage.com
```

The R2 token should have object read/write access only to the documentation
bucket. It does not need DNS, Worker, or account-administration permissions.

The central publication commands are:

```sh
node website-tools/scripts/docs/patch-doxygen-html.mjs \
  release-tree/reference

node website-tools/scripts/docs/create-manifest.mjs \
  --root release-tree --version "$VERSION" --output manifest.json

node website-tools/scripts/docs/publish-version.mjs \
  --root release-tree --version "$VERSION" --manifest manifest.json \
  --build-id "$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT" \
  --remote r2:gecode-documentation --confirm-upload

node website-tools/scripts/docs/verify-version.mjs \
  --version "$VERSION" --manifest manifest.json \
  --build-id "$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT" \
  --remote r2:gecode-documentation

node website-tools/scripts/docs/promote-version.mjs \
  --version "$VERSION" --manifest manifest.json \
  --build-id "$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT" \
  --remote r2:gecode-documentation --confirm-promotion
```

Pin `website-tools` to a reviewed commit or release tag. Do not run publication
tools directly from a moving branch in a production release job.

## Selecting `latest`

Uploading a release and selecting it as `latest` are separate operations. The
release pipeline should first smoke-test the immutable version through
`docs-staging.gecode.dev/doc/<version>/...`, including HTML, CSS, source views,
PDF ranges, fragments, and 404 behavior.

After those checks, a protected promotion job updates
`LATEST_DOC_VERSION`, deploys the staging Worker, tests both alias forms, and
then deploys the production Worker. Alias caches can serve the previous release
for at most five minutes. A failed promotion does not damage any immutable
release and can be rolled back by redeploying the previous version.

Keep Worker deployment credentials separate from the R2 upload token. This
lets ordinary release automation publish immutable documentation without also
granting it permission to change production routing.
