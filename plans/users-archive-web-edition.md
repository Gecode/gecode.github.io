# Plan: Users Archive Web Edition

> Source brief: conversation on 17 August 2026

## Goal

Turn the legacy Gecode users mailing-list archive into a separately published,
searchable web edition. The new edition should use the visual language of the
new MPG web version, preserve existing archive URLs, and follow the immutable
release and hosting model used for Doxygen and MPG documentation.

The current corpus contains approximately 9,300 files and 93 MB of data. The
existing dev-time copy into Astro's public directory remains a temporary
compatibility measure, not the final architecture.

## User stories

- A reader can browse archive years, months, threads, authors, and subjects.
- A reader can search message subjects, authors, dates, threads, and bodies.
- A reader can open an existing archive URL or download the original compressed
  monthly archive without encountering a broken link.
- A reader can use the archive on desktop and mobile with keyboard-accessible
  navigation and search.
- A maintainer can generate, verify, stage, publish, and promote an immutable
  archive snapshot.

## Architectural decisions

- **Stable routes**: Keep `/users-archive/` as the public entry point and keep
  existing `/users-archive/...` paths working. New generated pages should use
  the existing message and month paths where practical so old links remain
  useful.
- **Immutable snapshots**: Store each published archive under an immutable
  internal snapshot prefix. The stable public route resolves to the selected
  snapshot through a Worker rather than copying a `latest` tree.
- **Storage**: Use the private R2 bucket and publication conventions already
  established for Doxygen and MPG. Give the users archive its own product
  prefix and route resolver, even if it shares the bucket and generic tooling.
- **Release contents**: A snapshot contains the redesigned HTML, original
  raw archive files, compressed downloads, Pagefind assets, manifests, and
  sitemaps.
- **Search**: Use Pagefind as a static search index. Do not introduce a
  runtime database or search API for the first edition.
- **Data model**: Normalize each message into a stable record with message
  path, month, subject, author, date, thread relationships, body, and source
  path. Preserve the original source path as an explicit compatibility field.
- **Visual system**: Adapt MPG's layout, typography, navigation, responsive
  behavior, search modal, keyboard shortcut, result weighting, and focus
  treatment. Share design decisions, not undocumented implementation coupling.
- **Raw preservation**: Keep the original Mailman-generated HTML, text, and
  gzip files available as immutable fallback content. Redesign the presentation
  without discarding the historical source.

## Open decisions before implementation

- Choose the snapshot identifier format and whether immutable URLs are public
  or remain an internal storage detail.
- Decide whether legacy HTML pages are regenerated in the new shell at their
  existing paths or redirect to a new `/browse/` and `/message/` hierarchy.
  The recommended default is to keep existing paths and regenerate their shell.
- Decide whether message bodies should be fully indexed or whether search
  should initially emphasize subject, author, date, and thread metadata. The
  recommended default is to index message bodies with conservative weighting.
- Decide whether the archive source remains in this repository or moves to a
  dedicated producer repository. The first release can keep the current source
  here while publishing through the same release contract as MPG.

---

## Phase 1: Archive inventory and compatibility contract

**User stories**: Existing links keep working; maintainers can validate the
archive corpus.

### What to build

Create a deterministic inventory and parser for the current archive. Define the
mapping from legacy files to normalized messages, months, threads, and browsing
views. Use representative months to expose malformed HTML, missing metadata,
duplicate identifiers, broken relative links, and unsupported file types before
building the new interface.

### Acceptance criteria

- [ ] The inventory records every tracked file, byte count, MIME type, and
  digest.
- [ ] The parser produces stable records for representative old and recent
  months, including thread, subject, author, and date views.
- [ ] The compatibility map covers every existing HTML, text, and gzip path.
- [ ] Malformed or ambiguous source data fails the build with an actionable
  error.
- [ ] A local fixture proves that a legacy message path resolves to its source
  record and original download.

---

## Phase 2: Redesigned browsing slice

**User stories**: Readers can browse a month, thread, and message in the new
style while existing paths remain usable.

### What to build

Implement one complete vertical slice: the archive landing page, one month
overview, one browsing view, one thread, and one message. Render the normalized
records with the MPG-inspired shell, responsive navigation, readable message
content, source/download links, and stable anchors.

### Acceptance criteria

- [ ] The landing page explains the archive and exposes year/month navigation.
- [ ] A month page exposes thread, subject, author, and date views.
- [ ] A message page shows subject, author, date, thread context, body, and
  links to preserved raw or downloadable content.
- [ ] The slice works at desktop and mobile widths with visible keyboard focus.
- [ ] At least one existing legacy URL renders the new shell without changing
  its public path.
- [ ] Relative links and historical fragments continue to resolve.

---

## Phase 3: Pagefind search slice

**User stories**: Readers can search the archive and open useful results.

### What to build

Add a Pagefind build step and an MPG-style search experience. Mark message
content, headings, thread metadata, and high-value fields for indexing. Add
ranked result summaries, highlighted matches, a keyboard shortcut, focus
management, and query restoration across result navigation.

### Acceptance criteria

- [ ] The generated release contains a complete Pagefind index and required UI
  assets.
- [ ] Search is available from desktop and mobile navigation.
- [ ] `Cmd/Ctrl+K` opens search and focus moves to the query field.
- [ ] A known subject, author, and body-term query each return the expected
  message or thread result.
- [ ] Results link to stable archive URLs and close the modal before navigation.
- [ ] Navigation, footer text, and unrelated chrome do not pollute result
  summaries.
- [ ] Search produces no console errors for empty, partial, or unmatched
  queries.

---

## Phase 4: Immutable archive publication

**User stories**: Maintainers can publish a verified archive snapshot, and
readers receive fast, stable responses.

### What to build

Package the redesigned corpus and raw compatibility files as a clean release
tree. Reuse the Doxygen/MPG manifest, sitemap, staging, verification, and
promotion conventions. Add a Worker route for `/users-archive/*` with stable
snapshot selection, safe path handling, content metadata, range support for
downloads, cache headers, and branded 404 responses.

### Acceptance criteria

- [ ] The release builder rejects missing, extra, symlinked, or changed files.
- [ ] The manifest covers generated pages, raw files, downloads, search assets,
  and sitemaps.
- [ ] Staged content can be re-downloaded and verified byte-for-byte before
  promotion.
- [ ] Immutable snapshot URLs use long-lived caching and stable canonical
  metadata.
- [ ] The stable route selects one configured snapshot without duplicating a
  physical `latest` tree.
- [ ] Worker tests cover GET, HEAD, ranges, malformed paths, missing objects,
  content types, cache headers, and unexpected methods.
- [ ] Smoke tests cover the landing page, a message, a raw file, a gzip
  download, a Pagefind asset, and a 404.

---

## Phase 5: Full-corpus migration and cutover

**User stories**: Readers can use the complete archive, and maintainers can
operate it without the local Astro copy.

### What to build

Run the parser, renderer, Pagefind indexer, manifest checks, and publication
pipeline over the complete corpus. Compare the generated route inventory with
the legacy inventory, deploy the stable route, and retain a rollback path to
the current Pages artifact until production verification completes.

### Acceptance criteria

- [ ] All archive files are accounted for in the generated release or an
  explicit compatibility manifest.
- [ ] Legacy landing, month, thread, subject, author, date, message, text, and
  gzip URLs pass representative HTTP checks.
- [ ] The new search index returns results from early, middle, and recent
  archive periods.
- [ ] Sitemaps contain the intended canonical URLs and omit duplicate aliases.
- [ ] Desktop, mobile, keyboard, deep-link, download, and 404 smoke tests pass
  against the staged Worker and production route.
- [ ] The dev workflow no longer needs to copy the full archive once the
  separately hosted local or staging route is available.
- [ ] Rollback instructions and the selected snapshot identifier are recorded
  with the release.

## Non-goals for the first edition

- Live ingestion from Mailman or a runtime mail database.
- Reconstructing message content that is absent from the historical archive.
- Rewriting every historical URL before the compatibility contract is tested.
- Adding full-text search to the Doxygen Worker itself.
