# Astro and documentation deployment runbook

This runbook turns the migration branch into the production Gecode website
without combining the website and generated-documentation cutovers into one
irreversible step.

## Current state

The Astro site is ready to build with `npm run build:pages`. That artifact
contains the active website and `users-archive`, but not `doc` or `doc-latest`.
Generated documentation is served by the tested R2 Worker. Classical active
`.html` URLs are handled by a redirect Worker and also have small Pages fallback
files.

As checked on 9 August 2026, DNS is authoritative at Namecheap. `www.gecode.dev`
is a CNAME to `gecode.github.io`; the apex uses GitHub Pages A records; and the
domain has Namecheap email-forwarding MX and SPF records. Preserve all of those
records during the Cloudflare import. As checked locally on 11 August 2026,
Wrangler is not authenticated, so no Cloudflare resource has been created or
changed from this branch.

## 1. Prepare GitHub

1. Create protected GitHub environments named `cloudflare-staging` and
   `cloudflare-production`.
2. Require approval for `cloudflare-production` during the first releases.
3. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to both environments.
   The token needs Worker Scripts, Worker Routes, and R2 binding access for the
   `gecode.dev` zone. It does not need DNS-edit access when DNS is managed
   separately.
4. In the Gecode source repository, create a protected
   `documentation-production` environment with bucket-scoped R2 credentials:
   `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`.
5. Keep the website repository's Worker token separate from the Gecode release
   repository's object-upload token.

The manual `Deploy edge workers` workflow validates each Worker before using
the selected GitHub environment. Production remains an explicit action.

## 2. Provision Cloudflare without changing traffic

1. Add `gecode.dev` to the intended Cloudflare account.
2. Review the imported DNS records against the Namecheap zone. In particular,
   preserve the `www` CNAME, apex GitHub Pages records, MX records, and SPF TXT
   record.
3. Create a private R2 bucket named `gecode-documentation`.
4. Disable the public `r2.dev` endpoint for the bucket.
5. Create a bucket-scoped R2 object read/write token for documentation release
   automation.
6. Configure billing notifications before the first bulk upload.
7. Deploy the documentation Worker to staging. Its Wrangler configuration
   creates `docs-staging.gecode.dev` as a Worker Custom Domain and binds the
   production documentation bucket read-only.
8. Leave the production Worker routes undeployed at this point.

The release runner must set `RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true`; the
bucket-scoped token may not have permission to perform account-level bucket
discovery.

## 3. Upload and verify documentation

For the bootstrap migration, assemble each version directory without the
`latest` symlink and create a manifest. Upload historical versions to their
immutable version prefixes. Do not upload physical `doc/latest` or
`doc-latest` copies.

For 6.4.0 and every future release:

1. Assemble `release-tree/reference`, `release-tree/modeling` when available,
   and `release-tree/MPG.pdf` when published.
2. Apply the Doxygen compatibility patch.
3. Create a page manifest.
4. Generate `release-tree/sitemap.xml` and its shards from that page manifest.
5. Create the final SHA-256 manifest, which now includes the sitemap files.
6. Upload to `staging/<run-id>/<version>`.
7. Download and verify every staged object, including SHA-256 and content type.
8. Promote to the immutable `<version>` prefix.
9. Re-download and verify the final prefix.
10. Confirm `_manifests/<version>.json` was persisted.

Smoke-test the immutable release through
`https://docs-staging.gecode.dev/doc/<version>/`. Include the reference index,
changelog fragment, source view, stylesheet, script, image, PDF byte range,
missing path, and `sitemap.xml`. The staging custom domain is necessary because
Cloudflare's Cache API does not exercise production cache behavior on a
`workers.dev` hostname.

## 4. Move authoritative DNS to Cloudflare

1. Record the existing Namecheap zone and TTLs one final time.
2. Replace the domain's authoritative nameservers with the pair assigned by
   Cloudflare.
3. Wait until Cloudflare reports the zone active and verify website and email
   resolution from more than one resolver.
4. Keep `www` pointed at `gecode.github.io`, but enable the Cloudflare proxy.
   GitHub Pages remains the origin for every unmatched request.
5. Proxy the apex GitHub Pages records as well if the apex continues to redirect
   to `www`; verify that redirect before continuing.
6. Use Full (strict) TLS after the existing GitHub Pages certificate is
   accepted through the proxied hostname. Do not disable GitHub Pages HTTPS.

At this stage the old Jekyll deployment still serves production and removing a
Worker route remains sufficient rollback.

## 5. Canary the Workers

1. Deploy the documentation Worker production environment with a temporary
   canary route under `/doc/<version>/` if the Cloudflare dashboard supports a
   suitably narrow route, or enable the full documentation routes during a
   short monitored window.
2. Compare status, content digest, MIME type, range response, and key headers
   between the GitHub Pages archive and R2.
3. Verify ordinary pages such as `/`, `/download.html`, and `/download/` still
   reach GitHub Pages.
4. Deploy the redirect Worker and verify `.html` routes return `308` to their
   trailing-slash canonical while preserving queries.
5. Verify Doxygen `.html` routes remain content pages and are never handled by
   the active-site redirect Worker.
6. Confirm `/doc/sitemap.xml` serves the selected version's index and that its
   shards contain immutable versioned URLs.

The production documentation routes are `/doc`, `/doc/*`, `/doc-latest`, and
`/doc-latest/*`. The Worker selects aliases through `LATEST_DOC_VERSION`; it
does not copy alias objects.

## 6. Publish Astro

1. Run the full branch checks locally.
2. Run `npm run build:pages` and confirm `_site/doc` and `_site/doc-latest` do
   not exist while `_site/users-archive` does.
3. Push the migration branch and let the Pages workflow build and validate its
   artifact without deploying from a pull request.
4. Run the Pages workflow manually from the reviewed branch for the production
   cutover, or merge and let the default-branch deployment run.
5. Verify all routes in the page-by-page parity review at desktop and mobile
   sizes.
6. Watch Pages, Worker, and R2 errors and documentation 404s during the first
   day.

GitHub Pages receives an artifact comfortably below its 1 GB published-site
limit because generated documentation is no longer copied into it.

## 7. Complete release automation

Add the documented `release.published` job to the Gecode source repository. It
must build the exact release tag, assemble the combined documentation tree,
check out a pinned tag or commit of these publication tools, stage and verify
the R2 upload, and promote only a previously unused version prefix.

Selecting `latest` is a separate protected operation: update
`LATEST_DOC_VERSION`, deploy staging, test both alias forms, and then deploy
production. Alias caches may retain the preceding version for up to five
minutes.

## Rollback

During the first canary, remove the documentation and redirect Worker routes to
return all traffic to the existing GitHub Pages archive. If Astro itself must
be rolled back, redeploy the last known-good Pages artifact or revert the merge.

After documentation is removed from the repository artifact, roll back by
redeploying the Worker with the previous `LATEST_DOC_VERSION` or by disabling
only the alias promotion. Immutable versioned prefixes do not require data
restoration.
