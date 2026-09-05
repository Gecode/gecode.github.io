# Website migration and release readiness

Reviewed and updated on 5 September 2026. Three subagents reviewed deployment,
documentation serving and publication, and Gecode/MPG release integration.
The website migration was merged in [PR #7](https://github.com/Gecode/gecode.github.io/pull/7)
as `30ccd9636fb7eabed4b14ed5fea09602652ac0be` after clean-checkout CI passed.
The MPG and release-support producer changes remain local. Existing working
trees were preserved.

DNS migration, full historical R2 verification, staging/canary checks and the
production documentation cutover are complete. The final production checks
passed on 5 September at about 14:15 UTC. Astro and active-site redirects
were subsequently deployed and verified on the same day.
The owner approved proceeding after fresh production health checks, passing
website CI and verification of the retained rollback archive; no fixed
24-hour wait is required. Future coordinated releases have a
working local preparation slice; their publication coordinator is unfinished.

The hosting arrangement is Cloudflare DNS/proxy, Workers and private R2, with
**GitHub Pages as the Astro origin**. Moving Astro itself to Cloudflare Pages
or Workers is a separate project and is unnecessary for this cutover.

## Verified infrastructure

| Component | Observation |
| --- | --- |
| DNS | Cloudflare nameservers `milan` and `tegan` are authoritative; the zone is active. MX and SPF use Cloudflare Email Routing. |
| TLS | Cloudflare uses Full (strict) and Always Use HTTPS. Public HTTP redirects to HTTPS and the apex redirects to `www`. GitHub reports `https_enforced: false`; reconcile the origin setting separately. |
| Production website | Astro is live. All 23 canonical pages return 200; their classic URLs return 308 with queries preserved. The twelve redirect routes fail open to Pages fallbacks. |
| Production documentation | All nine historical versions and both aliases use R2. Only `/doc/latest/...` is indexable. The two production route patterns are fail-closed; the canary and superseded routes have been removed. |
| Staging documentation | The reviewed Worker was deployed through GitHub. Its tests and live HTTP smoke checks pass for immutable 6.4.0, both aliases, canonical links, redirects, static assets and PDF range behavior. |
| R2 | Public `r2.dev` access is disabled. The 14-day lifecycle applies only to staging. All nine archives were fully verified: 52,385 objects / 1,138,898,740 bytes, with no missing objects or hash failures. The 326 historical image-map MIME declarations are documented below. |
| Email | Email Routing destinations and catch-all Worker configuration are present. Real delivery and delivery alerts were not exercised. |
| GitHub | [Astro deployment](https://github.com/Gecode/gecode.github.io/actions/runs/33972798507) and [redirect deployment](https://github.com/Gecode/gecode.github.io/actions/runs/33973076305) passed. Validated `main` pushes deploy automatically; PRs only build and check. |
| Deployment credentials | All three Cloudflare environments now contain the account ID and dedicated `gecode-github-workers` token. Production accepts only `main` and `release/*-website` branches; the existing `zayenz` reviewer and approval settings were preserved. |

## Fixes completed

| Area | Result |
| --- | --- |
| Documentation downloads | Stale or weak `If-Range` validators now return the full current PDF. Matching validators retain range responses. `HEAD` ignores `Range`. |
| Documentation URLs | Bare version/alias roots and existing directory indexes redirect to a trailing slash, preserving queries. `/doc` and `/doc/` redirect to the documentation page. Missing files remain 404. |
| Historical publication | A completed version is checked before any write. Different manifests fail; identical retries verify the final tree without requiring staging. Partial destinations are checked before resuming. Completion-record creation is conditional and verified afterward. |
| Content updates | Removed the fixed news/publication counts. Checks follow source entries, and news anchors combine date and slug to avoid duplicate IDs. Release metadata tests no longer freeze 6.4.0. |
| CI | PR builds cannot cancel production Pages deployments. Production deployments serialize without cancellation. Pages artifacts retain for 30 days. Email tests and dry-run builds run in ordinary CI. |
| Worker dispatch | Defaults to documentation only. Production code permits `main`, or a release website branch for documentation only; protected-environment approval still applies. |
| Email forwarding | Both recipients are attempted even if one forwarding call fails; failures are then reported. Tests send no mail. |
| Archive compatibility | Restored numeric and `start`/`end` anchors in month pages and index aliases. Comparison of all 704 historical sort pages found no lost anchors. Removed the localhost-only link rewrite that broke static previews. |
| Development/build parity | Production preparation clears generated public assets. A scoped development-only handler serves archive HTML before Astro's root-file guard; static builds need no server adapter or archive routes. |
| MPG packaging | Successful HTML and PDF builds record the requested version. Packaging rejects missing or mismatched markers and excludes them from published files. |
| MPG content | Reference links use the requested release. Removed the unavailable global stylesheet and unsupported bulk-download promises; styling remains bundled locally. |
| Release preparation | Updates all four Astro and transitional YAML version/date fields plus the production Worker selection. Builds a matching reference inventory, runs maintained example checks, and assembles `reference/`, `modeling/` and `MPG.pdf` outside the website checkout. Bundle paths, file sets, sizes, hashes and PDF agreement are validated. |
| Publication boundary | Newly prepared Cloudflare releases stop before entering the obsolete publisher. No prepared release can silently use that older sequence. |
| Operating documentation | Reconciled the website, Worker and MPG instructions around release-support's direct R2 publication and Gecode-last order. Unimplemented steps are explicitly identified. |

The historical promoter requires rclone 1.75 or later and a single publisher
per version. Conditional creation protects the completion record; it is not a
lock around a whole prefix. Normal releases must use the future release-support
publisher, not the historical staging pipeline.

The relevant source is in [the docs Worker](../workers/docs/src/index.ts),
[historical promotion](../scripts/docs/promote-version.mjs),
[Pages CI](../.github/workflows/pages.yml),
[archive development handler](../scripts/archive-dev.mjs),
[MPG packaging](/Users/zayenz/gecode/MPG/rst/scripts/package_release.py), and
[release preparation](/Users/zayenz/gecode/release-support/scripts/release_lib/workflow.py).

## Rollback prepared

The July Pages artifact expired, and rebuilding the full classic site would
exceed the published-site size limit. The new
[rollback builder](../scripts/build-classic-rollback.py) exports exactly
`e7f812a19549b9ca8e2472c3fd4723e71ddee779`, excludes documentation, retains the
mail archive, dereferences symlinks and checks required pages and size.

A real build succeeded: **91,168,795 bytes** uncompressed. Its archive is
[dist/classic-rollback.tar.gz](../dist/classic-rollback.tar.gz). A verified copy is retained outside
this checkout at `/Users/zayenz/gecode/website-rollback/classic-site-2026-07-15.tar.gz`. It requires the
production documentation Worker and R2; remove active-site redirects when
restoring classic pages. The build was verified locally, not deployed.

Before Astro, removing documentation routes restores the old origin docs.
After Astro, recover the previous Worker deployment for serving failures.
Changing `LATEST_DOC_VERSION` repairs aliases only, not explicit version URLs.
Do not delete immutable R2 objects during rollback.

## Cutover sequence and completion

1. **Website code landed.** The migration, archive and Worker changes are on
   `main`, and clean-checkout CI passed. The classic rollback archive and
   executable restoration instructions are retained outside the checkout. MPG and
   release-support changes still need separate commits and producer rehearsal.
2. **Deployment access verified.** The dedicated Worker token is installed in
   `cloudflare-staging`, `cloudflare-canary` and `cloudflare-production`.
   Production branch restrictions and the existing reviewer were verified.
   The workflow additionally limits release branches to documentation deployment
   and validates the version pattern. Staging deployment through GitHub and its
   live smoke checks have passed.
3. **Operational checks partly complete.** Historical uploads and fail-closed
   documentation routes are verified. Native documentation logs are enabled.
   Real mail delivery and useful failure alerts remain to be checked; redirect
   routes now have their verified fail-open setting. Keep the current DNS delegation.
4. **Canary documentation verified.** The 6.4.0 deployment passed HTML, source
   folding, changelog fragment, CSS/JS/image, PDF ranges, missing paths,
   canonical links and sitemap checks. Ordinary Jekyll pages stayed unchanged during this step.
5. **Documentation moved.** Production routes, every historical version and
   both aliases pass verification. The canary is removed. Before Astro, check
   public documentation and Worker errors again and verify the rollback archive.
6. **Astro published.** The reviewed `main` artifact passed CI and deployed.
   All 23 canonical pages, downloads, publications, archive search-to-thread
   navigation and mobile layout pass. R2 documentation smoke checks pass.
7. **Redirects and routine updates enabled.** All classic active-site URLs
   redirect after the directory routes were verified. Documentation and archive
   `.html` URLs remain content. Validated `main` pushes deploy automatically.
   Production redirect deployments also set and verify route fail-open behavior.
   Live redirect Worker version: `1165ee03-782b-4f83-a687-0164a68d3087`.

The installed Worker token has Account Settings Read, Workers Scripts Write
and Workers R2 Storage Read, plus Zone Read and Workers Routes Write scoped to
the Gecode zone. It has no DNS-write or token-administration permissions and
no scheduled expiry. It is account-owned and named `gecode-github-workers`.
Release-support's separate object-publishing credential stays bucket-scoped.

After explicit user approval on 5 September, the token was created, verified
active and installed in all three environments. Read requests for Workers,
routes, the zone and the R2 bucket succeeded. The production environment was
restricted to the two approved branch patterns and its reviewer settings were
verified unchanged. The temporary token value was removed after installation.
No Worker, website, route or documentation content was deployed in this step.

After explicit approval and browser authorization added the GitHub CLI's
`workflow` scope, the staging-only branch was published and deployed. The
[successful run](https://github.com/Gecode/gecode.github.io/actions/runs/33964652752)
used commit `5ec53f3b111a46d92c42f8b996d79b86dc39cd80` on
`codex/verify-docs-staging-20260905`. The deployed Worker version is
`f9295ce3-1641-4727-b3d9-8f0c7f31b016`. Worker tests, dry-run builds and all
live checks in `scripts/docs/smoke-worker.mjs` passed. A bounded retry allows
for propagation immediately after deployment; the first attempt observed the
old redirect behavior before the new Worker reached that request. Production
routes were absent at that stage. The subsequent canary is recorded below.


## Historical archive and canary verification

Every historical R2 object was downloaded and compared with its manifest using
SHA-256, byte count, response length and MIME type. Complete key sets and sizes
were checked before and after downloading. All 52,385 files passed, across
1.3.1, 2.2.0, 3.7.3, 4.4.0, 5.1.0, 6.0.1, 6.1.1, 6.2.0 and 6.4.0.
Verification records are retained beside the rollback artifact in
`/Users/zayenz/gecode/website-rollback/verification-2026-09-05/`.

The old manifests wrongly declared 326 Graphviz `.map` files as JSON. R2 serves
them as `application/octet-stream`. Their bytes are intact. Verification accepts
only the known image-map formats (`<map`, `<area`, or `base referer` followed by
`rect`) with the original SHA-256. New manifests classify JavaScript/CSS source
maps as JSON and generic image maps as binary. No immutable objects or completion
records were rewritten.

The [canary deployment](https://github.com/Gecode/gecode.github.io/actions/runs/33967976199)
used merged commit `30ccd9636fb7eabed4b14ed5fea09602652ac0be`; Worker version
`aa0b09d7-026f-463d-af9f-5dfaa6fbec2f`. Its two routes cover only
`www.gecode.dev/doc/6.4.0` and `www.gecode.dev/doc/6.4.0/*`, both with
`request_limit_fail_open: false`. Browser checks confirmed the 6.4.0 changelog
fragment and functioning code folding, with no missing images or console errors
on the sampled source page. `/`, `/download.html` and the latest alias still
return classic content; `/download/` retains the expected pre-Astro 404.

Operational review found an enabled $10 budget email alert, but no failure-alert
policy. Documentation Worker logging is enabled in production,
using [native Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).
Production deployment smoke checks allow for the five-minute alias cache TTL.
Email Routing is ready, but delivery-event access requires Zone Analytics Read;
real delivery remains unverified. The native alert UI requires a Cloudflare
dashboard sign-in, and a notification policy alone does not configure a Worker
failure detector.

## Production cutover result

[PR #8](https://github.com/Gecode/gecode.github.io/pull/8) added latest-only indexing,
verified legacy map compatibility, native logs and production smoke checks.
[PR #9](https://github.com/Gecode/gecode.github.io/pull/9) fixed query routing and
the landing-page redirect. Both passed clean-checkout CI, staging and canary.

The [successful production run](https://github.com/Gecode/gecode.github.io/actions/runs/33970884194)
deployed `f4051a2c15626d99236cc284e1afa88ce8e4215e` as Worker version
`4d257836-ea9d-4820-8acb-d691082150f5`.
[Canary cleanup](https://github.com/Gecode/gecode.github.io/actions/runs/33971074416)
passed. The live route set was checked afterward and five superseded routes
were removed; only `www.gecode.dev/doc*` and `www.gecode.dev/robots.txt*` remain,
both fail-closed. After changing route patterns, verify the live set explicitly:
this Wrangler deployment retained older routes instead of removing them.

The final public checks cover all historical version headers/noindex, latest
and compatibility aliases, HTML/PDF indexing, query redirects, robots rules,
sitemap index and shards, missing pages, PDF ranges and the classic landing page.
The original production verification correctly failed on the queried `/doc`
entry point; the corrected deployment and final checks passed. `/doc` now uses
`/documentation.html`, which works throughout the classic-to-Astro transition.
No Astro or active-site redirect Worker deployment has occurred.

## Documentation indexing policy

The requested policy is to index only `https://www.gecode.dev/doc/latest/...`.
Versioned URLs, PDFs included, remain accessible with `X-Robots-Tag: noindex`.
The `/doc-latest/...` compatibility alias and staging hosts also return noindex.
Latest HTML and PDF responses identify their own latest URL as canonical.

The Worker rewrites the selected sitemap responses to latest URLs while leaving
immutable R2 artifacts intact. The shared robots file permits documentation
crawling, because crawlers must fetch a URL to see its noindex header. The
production Worker also serves `/robots.txt` so this policy can take effect before
Astro is deployed. Search results will change as search engines recrawl the URLs.

## Gecode and MPG release plan

Use the existing [release-support task list](/Users/zayenz/gecode/release-support/.zdev/cf/TASKS.md).
No parallel coordinator or new framework is needed. No task has been marked
complete prematurely: `cf-001` now has a local implementation but still needs
committed producer inputs and a complete fresh producer rehearsal.

| Order | Work | Required result |
| --- | --- | --- |
| Prerequisite | Website cutover and MPG stability | Automatic `main` deployment works; committed inputs produce matching versioned reference, modeling and PDF output from clean directories. |
| 1 | `cf-001`: finish preparation verification | Run the complete Gecode build/check/install, Doxygen 1.17.0 build, MPG examples, HTML and PDF preparation; retain the combined tree and manifest. |
| 2 | `cf-002`: MPG release primitives | Prepare MPG tags, draft assets and checksums from the retained artifacts. |
| 2 | `cf-003`: immutable R2 publication | Upload with copy semantics, verify complete paths/sizes/checksums, then conditionally create the completion record. Identical retries resume; conflicting completed versions fail before writes. |
| 3 | `cf-004`: website and aliases | Refresh only the website candidate if `main` advances. Verify its actual Pages deploy job and dispatch production Worker selection from the approved ref. |
| 4 | `cf-005`: final publication | Verify immutable docs and both aliases, publish MPG, then publish Gecode last. Retries reuse approved artifacts. |

Before the first MPG web release, add its website link only after the immutable
version exists. Verify Pagefind JS/WASM/data, fonts, PDF types, search, cross-manual
links and deep fragments through R2. The initial namespace shares the Gecode
version; include MPG corrections in the next coordinated release. Independent
MPG revisions need an explicit identifier/alias policy and must never overwrite
an existing tree.

Rehearse interrupted publication, conflicting completion records, website
advancement before and after tagging, publication resume and alias rollback in
a disposable non-production prefix. Website-only updates must not rebuild
Gecode/MPG or republish documentation.

R2 objects become visible individually during upload; the Worker does not wait
for the completion record. Keep website links and aliases on the old version
until full verification succeeds. Retain a recoverable copy of each release
outside the live bucket.

## Verification and limits

Completed locally:

- Full website quality gate: Astro build, HTML, executable modes, 23 canonical
  routes, rendered semantics, 2 content tests, 10 documentation-tool tests,
  21 documentation-Worker tests, 5 redirect tests and 9 email tests; all configured
  Worker dry-run builds pass.
- Pages artifact: 12,198 files and 124,084,466 bytes, without documentation
  trees or symlinks. Archive path checks across 8,767 HTML files, restored
  anchor comparison, and browser search-to-thread navigation. The selected
  thread was checked at desktop and 390-pixel widths. The same development URL
  was verified in a browser after fixing its browser-only 404.
  Browser-style requests also passed for the archive root, month index, query
  strings, HEAD requests and missing pages.
- Real MPG HTML build: 51 pages, local links, redirects, search assets and
  version marker verified. MPG's 14 unit tests and package-release platform
  tests pass.
- Full MPG 6.4.0 PDF rehearsal: 609 pages / 2,799,680 bytes. PDF metadata,
  references, glyph/text extraction checks and immutable/latest URL annotations
  pass. The successful version marker matches the earlier HTML build. No MPG
  release was published.
- Release-support's 50 tests and existing build dry run pass. Tests cover
  metadata advancing to 7.0.0, bundle corruption/mismatch and the publication
  stop. No real Gecode release was built or published.
- The 91 MB classic rollback build from the exact July commit succeeds.

Still required: a complete coordinated Gecode producer rehearsal, the
real mail delivery and failure-alert setup.
Clean-checkout CI and internal lychee checks pass; nonblocking external checks
include broken historical external links. The archive browser samples are not
an exhaustive accessibility or Lighthouse audit.
