# Astro and documentation deployment runbook

This runbook turns the migration branch into the production Gecode website
without combining the website and generated-documentation cutovers into one
irreversible step.

## Current state

The Astro site is ready to build with `npm run build:pages`. That artifact
contains the active website and `users-archive`, but not `doc` or `doc-latest`.
The tested R2 Worker will serve generated documentation after phase 5. The
Astro artifact pairs a redirect Worker for classic active `.html` URLs with
small Pages fallback files.

As checked on 5 September 2026, Cloudflare is authoritative for `gecode.dev`.
Cloudflare proxies the apex GitHub Pages A records and the `www` CNAME to
`gecode.github.io` with Full (strict) TLS and Always Use HTTPS. GitHub Pages
still serves the production website and documentation; the Astro artifact has
not been deployed.

Cloudflare Email Routing is ready. Its managed MX, SPF, and DKIM records are
authoritative, both forwarding destinations are verified, and the catch-all
rule sends mail through the checked-in `gecode-email-routing` Worker. The
private R2 documentation archive and `docs-staging.gecode.dev` Worker custom
domain are live and pass the phase 4 smoke tests. No canary or production
documentation Worker routes exist yet.

The `cloudflare-staging`, `cloudflare-canary`, and `cloudflare-production`
GitHub environments contain the stable Cloudflare account ID and the dedicated
`gecode-github-workers` deployment token. Production requires approval from
`zayenz` and accepts only branches matching `main` or `release/*-website`.
These access changes were applied and verified on 5 September with explicit
approval. The full local quality gate passes on the current Astro branch.

The [5 September readiness review](migration-readiness-review-2026-09-05.md)
records the local fixes, rollback build, verification limits and remaining
work. Phases 2–4 below describe the original migration sequence; DNS delegation
and infrastructure setup are largely complete. Staging deployment through
GitHub now passes. Continue with clean-checkout website CI and phase 5 checks.

## Cutover overview

Keep each traffic change separate. Finish the preparation and bulk transfer
without changing production, move DNS while GitHub Pages still serves the
entire old site, move documentation, and publish Astro only after the
documentation path has soaked.

| Phase | When | Mostly unattended work | Attended checkpoint | Safe state afterward |
| --- | --- | --- | --- | --- |
| 1. Land deployment code | Now | Run CI on a pull request; build the Pages artifact without deploying it. | Review and merge the Worker, publication-tool, runbook, and manual-only Pages workflow changes. | The public site is unchanged. |
| 2. Prepare Cloudflare and GitHub | After phase 1; no maintenance window required | Create the pending zone, bucket, lifecycle rule, environments, and secrets. | Verify the Email Routing destinations and prepare the disabled routing Worker. | The public site is unchanged; Cloudflare has no traffic. |
| 3. Copy documentation | After the R2 token exists; run overnight if useful | Upload and verify 6.4.0, then all historical immutable versions. | Review the manifests and representative files before DNS delegation. | GitHub Pages still serves production; R2 holds a verified copy. |
| 4. Delegate DNS | In a short attended window after phases 2 and 3 | Wait for nameserver propagation and the Cloudflare zone to become active. | Test the website, TLS, apex redirect, and every mail alias. Restore the Namecheap nameservers if any of them fail. | GitHub Pages still serves the entire site through Cloudflare. No Worker production routes exist. |
| 5. Move documentation | After DNS is stable; use a separate attended window | Let the production documentation routes soak for at least one day. | Test one version through the canary route, deploy the production routes, retest, and remove the canary. | R2 serves `/doc/*` and `/doc-latest/*`; GitHub Pages still contains the old documentation for quick rollback. |
| 6. Publish Astro | After the documentation soak; use a separate attended window | Let the Pages deployment and monitoring run. | Deploy the reviewed Astro artifact and check the parity routes at desktop and mobile sizes. | Astro serves the website; R2 continues to serve documentation. Redeploy the previous Pages artifact to roll back Astro. |
| 7. Enable permanent active-site redirects | After Astro is confirmed healthy, either later that day or the next day | Monitor redirect and origin errors. | Deploy the redirect Worker and test every classic active-site `.html` URL. | Classic URLs return `308`; Pages fallback files remain available if the redirect Worker fails. |
| 8. Add release automation and the web manual | After the cutover is stable | Build, validate, upload, and verify future documentation from release workflows. | Approve immutable publication and the separate `latest` change. | New Doxygen and modeling-manual releases follow the coordinated release pipeline. |

Phases 2 and 3 contain most of the work and can run while unattended. Phases 4
through 7 are deliberately short and separated by stable, working states. At
no point does a scheduled wait require `gecode.dev` to be unavailable.

Do not deploy the active-site redirect Worker before phase 6. The current
Jekyll origin serves `/download.html` and similar classic URLs but returns 404
for their new directory forms. The Astro artifact includes fallback redirect
files, so deploying the redirect Worker after Astro is safe.

Keep the Pages deploy job manual-only throughout the migration. Pushes and pull
requests still build and validate the artifact. Restore automatic default-branch
deployment in a separate change after the Astro deployment is stable.

The first R2 migration does not depend on the rewritten *Modeling and
Programming with Gecode* site. Reserve `modeling/` in each release tree now and
publish the first web edition when its generator and release cadence are ready.
Before automating that producer, decide whether it shares Gecode release
versions under `/doc/<version>/modeling/` or needs an independently versioned
namespace. The current Worker already supports the first layout without code
changes.

## 1. Prepare GitHub

1. Create protected GitHub environments named `cloudflare-staging`,
   `cloudflare-canary`, and `cloudflare-production`.
2. Require approval for `cloudflare-production` during the first releases.
   Restrict its deployment branches to `main` and `release/*-website`; the
   workflow additionally validates release branch names and permits only
   documentation deployment from them.
3. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to all three
   environments.
   The token needs Worker Scripts, Worker Routes, and R2 binding access for the
   `gecode.dev` zone. It does not need DNS-edit access when DNS is managed
   separately.
4. In the release-support repository, create a protected
   `documentation-production` environment with bucket-scoped R2 credentials:
   `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`.
5. Keep the website repository's Worker token separate from the release-support
   repository's bucket-scoped object read/write token. Cloudflare's persistent
   R2 token can also list and delete objects in that bucket; the publication
   scripts avoid deletion, but the credential is not technically upload-only.
   Protect and rotate it accordingly. Prefer short-lived prefix-scoped R2
   credentials when the release workflow gains credential-broker support.

The manual `Deploy edge workers` workflow validates each Worker before using
the selected GitHub environment. Production remains an explicit action.

The installed account-owned token is named `gecode-github-workers`. Its account
permissions are Account Settings Read, Workers Scripts Write and Workers R2
Storage Read. Its Zone Read and Workers Routes Write permissions are limited
to `gecode.dev`. It has no DNS-write or token-administration permission and no
scheduled expiry. Token verification and read requests for Workers, routes,
the zone and the documentation bucket passed. A real GitHub staging deployment
also passed on 5 September after explicit approval and browser authorization
added the CLI's `workflow` scope.

The successful [staging run](https://github.com/Gecode/gecode.github.io/actions/runs/33964652752)
used commit `5ec53f3b111a46d92c42f8b996d79b86dc39cd80` on
`codex/verify-docs-staging-20260905`. That branch contains a limited Worker
snapshot with a staging-only push workflow and suppresses the old Pages
workflow for its branch. Land the complete website migration separately.
Worker tests, dry-run builds, deployment and all HTTP smoke checks passed.
The deployed `gecode-documentation-staging` version is
`f9295ce3-1641-4727-b3d9-8f0c7f31b016`. The pre-rehearsal version was
`8bfa5cfb-1c96-4cb6-8f57-d5d2bb85080c`. Production and canary zone routes remain
absent, and the classic production pages still return 200.

To replace the token, create a new token with those permissions, set
`CLOUDFLARE_API_TOKEN` in all three environments, verify a staging deployment,
then revoke the old token. Keep token values out of repository files and logs.
The value created on 5 September was passed to `gh secret set` through standard
input; its temporary local copy was removed after all three installs succeeded.

After a documentation deployment, run
`node scripts/docs/smoke-worker.mjs https://docs-staging.gecode.dev 6.4.0`
(substitute the selected version). It checks immutable and alias URLs,
canonical headers, directory redirects, CSS, sitemap, missing pages and PDF
range validators without downloading the full PDF.
The staging workflow retries this read-only check up to six times, ten seconds
apart. The first rehearsal briefly observed the old Worker immediately after
deployment; persistent failures still fail the job.

## 2. Provision Cloudflare without changing traffic

1. Add `gecode.dev` to the intended Cloudflare account.
2. Review the imported DNS records against the Namecheap zone. Preserve the
   `www` CNAME and apex GitHub Pages records. Record the old Namecheap MX and SPF
   records for rollback, but do not treat them as a working mail configuration
   after delegation.
3. Add and verify every Cloudflare Email Routing destination address. Deploy
   the checked-in email-routing Worker and prepare its catch-all rule in the
   disabled state. Cloudflare refuses to onboard Email Routing DNS for a
   pending zone, so add its MX, SPF, and DKIM records during the attended DNS
   cutover. Do not copy Namecheap's forwarding MX and SPF records.
4. Create a private R2 Standard bucket named `gecode-documentation`.
5. Disable the public `r2.dev` endpoint for the bucket.
6. Add an object lifecycle rule that expires keys below `staging/` after 14
   days. Do not apply expiration or storage-tier transitions to immutable
   version prefixes. See Cloudflare's
   [R2 lifecycle documentation](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
7. Create a bucket-scoped R2 object read/write token for documentation release
   automation.
8. Configure billing notifications before the first bulk upload.
9. Deploy the documentation Worker to staging. Its Wrangler configuration
   creates `docs-staging.gecode.dev` as a Worker Custom Domain and binds the
   production documentation bucket. The Worker code uses only `head()` and
   `get()`; Wrangler cannot make an R2 binding read-only.
10. Leave the canary and production Worker routes undeployed at this point.

The release runner must set `RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true`; the
bucket-scoped token may not have permission to perform account-level bucket
discovery.

## 3. Upload and verify documentation

For the bootstrap migration, assemble each historical version in a temporary
directory without the `latest` symlink. Apply the compatibility patch there,
create the page manifest and sitemap, and then create the final manifest.
Copy the result directly to its immutable version prefix, verify the complete
path set, sizes, and MD5 hashes, and persist `_manifests/<version>.json` only
after that check succeeds. Do not upload physical `doc/latest` or `doc-latest`
copies.

Future releases use the combined `reference/`, `modeling/`, and `MPG.pdf`
contract in [the release pipeline](gecode-release-pipeline.md). They do not use
the historical compatibility patch.

Before DNS delegation, complete manifest verification and local Worker tests.
The public staging hostname may not resolve while the Cloudflare zone is
pending. Defer the cache-behavior smoke test until step 4 activates the zone;
a `workers.dev` hostname cannot exercise the Cache API.

## 4. Move authoritative DNS to Cloudflare

1. Record the existing Namecheap zone and TTLs one final time.
2. Replace the domain's authoritative nameservers with the pair assigned by
   Cloudflare.
3. Wait until Cloudflare reports the zone active. Immediately onboard Email
   Routing DNS, confirm that Cloudflare added its MX, SPF, and DKIM records,
   and enable the prepared catch-all Worker rule. Verify website resolution
   from more than one resolver, then send a message to every forwarding alias
   and confirm delivery to every destination. Cloudflare cannot create these
   mail records while the zone is pending, so treat this as an attended step.
   If forwarding fails, restore the Namecheap nameservers before continuing.
4. Keep `www` pointed at `gecode.github.io`, but enable the Cloudflare proxy.
   GitHub Pages remains the origin for every unmatched request.
5. Proxy the apex GitHub Pages records as well if the apex continues to redirect
   to `www`; verify that redirect before continuing.
6. Use Full (strict) TLS after the existing GitHub Pages certificate is
   accepted through the proxied hostname. Enable Always Use HTTPS, and do not
   disable GitHub Pages HTTPS.
7. Smoke-test the immutable release through
   `https://docs-staging.gecode.dev/doc/<version>/`. Include the reference
   index, changelog fragment, source view, stylesheet, script, image, PDF byte
   range, missing path, and `sitemap.xml`.

At this stage the old Jekyll deployment still serves production and removing a
Worker route remains sufficient rollback.

## 5. Canary the documentation Worker

1. Update the checked-in `canary` environment in
   `workers/docs/wrangler.jsonc` so its route and `LATEST_DOC_VERSION` name the
   release under test. Deploy it through the `cloudflare-canary` GitHub
   environment. Do not create a dashboard-only route because Wrangler treats
   the checked-in routes as authoritative.
2. Compare status, content digest, MIME type, range response, and key headers
   between the GitHub Pages archive and R2.
3. Verify ordinary pages such as `/`, `/download.html`, and `/download/` still
   reach GitHub Pages. Before the Astro cutover, `/download.html` returns 200
   and `/download/` returns the old origin's expected 404.
4. Verify Doxygen `.html` routes remain content pages and are handled by the
   documentation Worker.
5. Deploy the production documentation routes and rerun the smoke tests.
   Confirm `/doc/sitemap.xml` serves the selected version's index and that its
   shards contain immutable versioned URLs.
6. Use the workflow's `remove-canary` operation with the `canary` environment.
   The narrow canary route is more specific than `/doc/*` and would otherwise
   keep intercepting that version.

The production documentation routes are `/doc`, `/doc/*`, `/doc-latest`, and
`/doc-latest/*`. The Worker selects aliases through `LATEST_DOC_VERSION`; it
does not copy alias objects.

Set the documentation routes to fail closed: after documentation leaves the
Pages artifact, fail-open traffic would reach a missing origin path. Set the
redirect routes to fail open because their Pages fallback files preserve the
old URLs when that Worker is unavailable.

## 6. Publish Astro

1. Run the full branch checks locally.
2. Run `npm run build:pages` and confirm `_site/doc` and `_site/doc-latest` do
   not exist while `_site/users-archive` does.
3. Push the migration branch and let the Pages workflow build and validate its
   artifact without deploying from a pull request.
4. Run the Pages workflow manually from the reviewed default branch for the
   production cutover.
5. Verify all routes in the page-by-page parity review at desktop and mobile
   sizes.
6. Deploy the redirect Worker and verify that classic active-site `.html` routes
   return `308` to their trailing-slash canonical while preserving queries.
7. Verify that Doxygen `.html` routes remain content pages and are never
   handled by the active-site redirect Worker.
8. Watch Pages, Worker, and R2 errors and documentation 404s during the first
   day.

After the Astro deployment is stable, restore automatic Pages deployment for
default-branch pushes in a separate reviewed change.

GitHub Pages receives an artifact comfortably below its 1 GB published-site
limit because generated documentation is no longer copied into it.

## 7. Complete release automation

Implement release-support's existing `cf-001` through `cf-005` tasks, following
[the release contract](gecode-release-pipeline.md). The coordinator must build
and verify immutable documentation before publishing MPG and then Gecode.
A `release.published` event may check the result; it must not initiate this
publication process. Restore automatic website `main` deployment first.

The historical staged publisher is not the ordinary release path. Selecting
`latest` remains a protected website operation after immutable URLs pass their
smoke checks. Staging and canary are required for migration or Worker-code
changes; content-only releases use the existing production Worker. Alias
caches may retain the preceding version for up to five minutes.

## 8. Monitor cost and availability

The migrated archive contains 52,385 documentation files and 1.139 GB of object
data. R2 Standard includes 10 GB-month, one million Class A operations, and ten
million Class B operations each month. The initial direct uploads and checksum
verification fit comfortably within those allowances. Lifecycle expiry
prevents temporary staging trees from accumulating indefinitely.
At the current release size of about 168 MB, the final prefixes can grow by
roughly 52 similar releases before exceeding the storage allowance.

Cloudflare budget alerts are informational: they neither cap usage nor stop
services. Configure several low thresholds and product-specific usage
notifications; Cloudflare does not provide a hard account spending limit for
this setup.

Workers Free, not R2 storage, is the likely first limit. It permits 100,000
Worker requests per UTC day across the account, and cache hits still count as
Worker requests. Create notifications at 70,000 and 90,000 daily requests if
the account's notification controls support those thresholds; otherwise check
the usage dashboard daily during cutover and weekly afterward. Upgrade to
Workers Paid before normal traffic approaches 100,000 requests per day. The
paid plan starts at USD 5 per month and includes ten million requests per
month. R2 Standard storage above 10 GB-month costs USD 0.015 per GB-month, and
Internet egress is free. See Cloudflare's [Workers
pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [R2
pricing](https://developers.cloudflare.com/r2/pricing/).

Namecheap remains the registrar. As checked on 12 August 2026, its published
`.dev` renewal is USD 20.98 per year, with a possible USD 0.20 ICANN fee. This
existing registrar cost is separate from hosting. See [Namecheap `.dev`
pricing](https://www.namecheap.com/domains/registration/gtld/dev/).

Monitor these signals during the first day and review them monthly afterward:

- Worker request count, errors, CPU limit failures, and route-limit usage;
- documentation 404 and 503 responses;
- cache hit ratio and R2 Class A/Class B operations;
- R2 Standard storage, including the size of `staging/`;
- GitHub Pages origin availability; and
- Cloudflare Email Routing delivery failures.

Keep a release manifest and a recoverable source for every immutable version.
The repository history and release artifacts are the current recovery source;
R2 immutability conventions do not protect against account loss or a
bucket-wide deletion.

## Rollback

During the first canary, remove the canary route to return that version to the
existing GitHub Pages archive. Before the Astro cutover, remove the production
documentation routes for the same rollback. If Astro itself must be rolled
back, redeploy a retained, verified Pages artifact. New Pages artifacts have 30-day
retention. The July 2026 artifact has expired; prepare the small classic-site
rollback described below before the first cutover. Remove
the redirect Worker while the old artifact is active because that artifact
does not serve the new directory URLs. Restore the Namecheap nameservers if
Cloudflare DNS or Email Routing fails during delegation.

After documentation is removed from the repository artifact, roll back by
redeploying the Worker with the previous `LATEST_DOC_VERSION` or by disabling
only the alias promotion. Immutable versioned prefixes do not require data
restoration.

## Prepare a classic-site rollback

The full old artifact exceeds the Pages published-site limit. Build the classic
site from commit `e7f812a19549b9ca8e2472c3fd4723e71ddee779`, retaining the mail
archive but excluding `doc/` and `doc-latest/`. Verify its active pages, archive
and size, and retain the archive and rebuild instructions outside ephemeral CI
storage before publishing Astro. This restores the classic appearance while
continuing to use the production documentation Worker and R2.

Run `python3 scripts/build-classic-rollback.py` from the website checkout with
the existing Bundler dependencies installed. It creates
`dist/classic-rollback/` and `dist/classic-rollback.tar.gz`, refusing to replace
an existing output directory. The 5 September rehearsal produced 91,168,795
uncompressed bytes. Keep the tarball outside this checkout before cutover;
restore its contents as the Pages artifact when needed.

Before Astro, removing the documentation routes restores the existing origin
archive. After Astro, restore the previous Worker deployment for a serving
failure; changing `LATEST_DOC_VERSION` only repairs aliases. Keep immutable
objects intact. Remove the active-site redirect Worker when restoring classic
pages because their directory URLs are not available.
