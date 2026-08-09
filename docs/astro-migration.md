# Astro migration analysis

This branch replaces Jekyll with Astro 7 while preserving the public site’s
content and visual identity. Existing `.html` URLs remain compatible redirects,
while trailing-slash directory URLs become canonical. It is an exploratory
branch. Do not deploy it until the archive plan in this document is resolved.

## What exists today

The repository already contains a useful first modernization pass. Commits
`286cace43` through `5ce5ea709` introduced Tailwind CSS 4, responsive Jekyll
layouts, structured navigation and publication metadata, local fonts, HTML
validation, Lighthouse checks, and a custom GitHub Pages workflow. The Astro
work builds on those changes.

The active site is small:

- 12 top-level HTML pages
- 11 publication detail pages
- 45 news entries embedded on the home and news pages
- 11 publication entries with structured frontmatter

The frozen archives dominate the repository:

| Content | Approximate size | Files |
| --- | ---: | ---: |
| Versioned Doxygen documentation | 1.2 GB | 52,000+ |
| Mailing-list archive | 93 MB | 9,000+ |
| Active site, images, fonts, downloads, and papers | 13 MB | under 200 |

Jekyll expands `doc/latest` and `doc-latest` into two extra copies of the 6.4.0
manual. This increases `_site` from about 1.2 GB to 1.6 GB.

## Decisions in this branch

### Astro, Tailwind, and React

Astro generates the static site. Tailwind 4 runs through its supported Vite
plugin. The React integration remains available for future interactive islands,
but the current pages ship no client-side application code. Mobile navigation
uses native `<details>` and `<summary>` elements and works without JavaScript.

Astro uses `build.format: "directory"` with `trailingSlash: "always"`. It emits
pages such as `download/index.html`, which GitHub Pages serves canonically at
`/download/`. Navigation, canonical metadata, Open Graph metadata, sitemaps,
and new content all use those directory URLs. The configuration omits `base`
because this organization Pages site and its custom domain both serve from `/`.

The build also writes small `.html` fallback redirect pages. A Cloudflare
Worker supplies permanent `308` redirects from classic active-site `.html`
routes to their trailing-slash equivalents once `www.gecode.dev` is proxied for
the documentation-hosting cutover. It does not rewrite generated Doxygen or
mailing-list URLs. `/index.html` is handled only at the edge because it is also
the physical GitHub Pages entry file.

### Content compatibility

The first migration step keeps the existing Jekyll HTML files as source. A
small build-time adapter reads their frontmatter, resolves the limited Liquid
syntax, and passes their HTML into Astro layouts. This approach changes the
generator and visual shell without mixing in an editorial rewrite.

This adapter is temporary. Move `_news` and `_publications` into typed Astro
content collections after the visual and deployment approach settles. Convert
the top-level content into `.astro` or Markdown files at the same time. The
adapter keeps that later change mechanical and reviewable.

### Visual direction

The migration preserves the classic Gecode presentation: logo, green navigation
rail, blue links, compact typography, page proportions, and news column. Layout
changes are limited to accessibility and responsive bug fixes. Mobile pages use
a compact navigation disclosure and a single reading column, while desktop pages
retain the established geometry. Broader visual changes belong in later,
targeted work.

### Generated documentation

Astro does not parse the Doxygen or mailing-list archives. `npm run build`
builds the 24 active routes and copies only small static assets. This keeps the
normal feedback loop under 20 seconds.

`npm run build:deploy` adds the frozen archives after Astro finishes. Its copy
step replaces the two documentation symlinks with small HTML redirect trees,
which preserve deep HTML routes and URL fragments without duplicating the
current manual twice. GitHub Pages artifacts reject symbolic links, so the
mailing-list copy dereferences its small index aliases.

## Changelog overlap

The changelog bug comes from the Doxygen theme, not Jekyll. Doxygen 1.17 emits
the page body in `#doc-content`, while the classic stylesheet constrains only
the old `#content` wrapper. The fixed navigation begins at 70% of the viewport,
so long text continues beneath it.

This branch patches `doc/6.4.0/reference/stylesheet.css`:

- desktop pages reserve the right 30% for the fixed logo, navigation, and footer;
- narrow pages place the logo and navigation in normal flow;
- narrow pages keep the generated footer in normal flow;
- content uses the full available width without horizontal overlap.

The browser check at 1440 × 900 measured the content’s right edge at 1000 px
and the navigation’s left edge at 1008 px. At 390 × 844, the navigation became
static and both navigation and content stayed within the viewport.

The Gecode source repository must own the corresponding header and stylesheet
rules. Future generated pages also need viewport metadata, the canonical HTTPS
home link, and the `codefolding.js` script used by their initialization code.
Without generator-level changes, the next documentation build will reintroduce
the layout problem.

## Alternatives considered

### Keep Jekyll and improve the theme

This has the smallest immediate diff, and the current Jekyll pass is sound.
It keeps Ruby, Liquid, and GitHub’s special Jekyll history in the toolchain,
however, and offers no clean path to interactive islands. It also leaves the
archive-copy problem unchanged.

### Use Eleventy

Eleventy would migrate the existing HTML and Liquid with less translation. It
is a strong static generator, but React islands need a separate client
integration and more conventions. Astro fits the stated stack better.

### Use Next.js static export

Next.js provides excellent React support but makes static content and the
opaque archive the secondary case. It would ship more client-side machinery
and impose more routing constraints than this site needs.

### Wrap Doxygen in Astro or an iframe

Both approaches break relative Doxygen assets, search behavior, deep links, or
scroll targets. Keeping each generated manual standalone preserves its internal
contract and allows an upstream theme fix.

### Put all archives in Astro’s `public` directory

This works in principle, but it makes every local build copy more than 60,000
files. The post-build copy keeps the active feedback loop fast and makes archive
handling explicit.

## Deployment blocker

GitHub documents a 1 GB limit for a published Pages site. Removing duplicate
aliases saves about 340 MB, but the versioned documentation and mailing-list
archive still exceed 1 GB before compression. The existing deployment already
exceeds this limit; changing generators does not solve it.

Choose one of these approaches before production cutover:

1. Keep only current documentation on Pages and move historical versions to
   release archives or object storage. This saves the most space but changes
   old deep URLs.
2. Host all generated documentation on a separate static host or CDN while
   keeping `www.gecode.dev` for Astro. Redirect `/doc/*` at the edge. This
   preserves deep URLs but requires infrastructure outside GitHub Pages.
3. Remove redundant generated source pages and other heavy Doxygen output from
   historical versions after a link and usage audit. This may fit Pages while
   preserving high-value reference pages, but it creates incomplete manuals.
4. Ask GitHub Support whether the current project can retain a larger Pages
   allowance. Treat approval as an exception, not a portable build assumption.

Option 2 gives the cleanest long-term boundary and is now the recommended
approach. The detailed design preserves the existing `/doc/` paths while the
Astro site remains on GitHub Pages. See
[Static documentation hosting plan](static-documentation-hosting.md).

## Before cutover

- Choose and test the archive-hosting plan.
- Apply the Doxygen CSS fix in the Gecode source repository.
- Convert legacy content into typed Astro collections.
- Decide whether to add a real news RSS feed; Jekyll’s current feed is empty.
- Compare the old and new route manifests. The new `404.html` is intentional,
  and the active `.html` routes must redirect to trailing-slash canonical URLs.
- Run internal and external link checks against a deployment-equivalent build.
- Run Lighthouse against the home, news, documentation, and publication pages.
- Test the archive redirects and changelog anchors from the deployed artifact.
- Test every classic active-site `.html` redirect through the proxied domain.
