# Classical site parity review

Review date: 11 August 2026

## Scope and method

This review compares the deployed Jekyll site at `www.gecode.dev` with the
Astro build from this branch. It covers every active website page and samples
generated documentation rather than attempting to inspect all 52,000 archived
files.

Each active route was checked at 1440 × 900 and 390 × 844. The checks compared
visible text, heading structure, typography, colors, content and sidebar
geometry, navigation state, document height, and horizontal overflow.
Representative pages were also inspected visually. The generated-documentation
sample covers a changelog, the current reference index, a current source view,
and two historical reference indexes.

The review treats the following as intentional fixes, not redesign:

- canonical routes use trailing slashes, while every classical `.html` URL
  remains as a redirect;
- section headings use a correct `h1` → `h2` hierarchy instead of skipping to
  `h3`;
- mobile navigation uses a keyboard-accessible native disclosure;
- broken entities, punctuation, empty links, and incomplete metadata are
  corrected;
- current Doxygen output receives viewport, layout, code-folding, and home-link
  fixes.

## Visual identity and layout

The rewrite preserves the classical Gecode presentation:

- Open Sans body text at 90% with the original line height;
- Raleway, lowercase, letter-spaced navigation labels;
- Roboto Mono for code;
- the green left edge, white surface, blue links, and original Gecode logo;
- the classical 68% content / 24% sidebar split with 3% outer spacing;
- the fixed desktop relationship between the main content, logo, navigation,
  latest-news rail, and small disclaimer footer.

The desktop navigation is left-aligned as on the deployed site. A temporary
right-alignment in the rewrite was found during this review and removed. The
interfaces and projects list styles were also restored after a missing selector
caused excessive paragraph spacing.

At 960 pixels and below, the rewrite deliberately departs from the old desktop
rail: it places a compact “Explore Gecode” disclosure before the page and moves
the news rail below the content. All 23 active pages fit the 390-pixel viewport
without horizontal scrolling. The extra 48 pixels before the main content is
the mobile menu, not a content-layout drift.

## Page-by-page comparison

| Canonical route | Content and structure | Layout and classical style | Result |
| --- | --- | --- | --- |
| `/` | Visible copy and headings match. The current Global Constraint Catalog link is retained. | Desktop geometry, type, logo lockup, definition list, sidebar, and footer match; page height differs by 6 px. Mobile adds the disclosure and does not overflow. | Pass |
| `/community/` | Copy and links match. Four skipped `h3` headings are corrected to `h2`. | Classical prose/list layout and sidebar geometry match at desktop; mobile stacks cleanly. | Pass with semantic fix |
| `/disclaimer/` | Copy, heading, and link match exactly. | Desktop and mobile geometry match apart from the mobile disclosure offset. | Pass |
| `/documentation/` | Copy and version links match. Three skipped `h3` headings are corrected to `h2`. | Classical compact section layout and documentation entry points are preserved. | Pass with semantic fix |
| `/download/` | Release copy, commands, archives, and links match. Leaked Liquid capture values have been removed. Three skipped `h3` headings are corrected to `h2`. | Monospace commands, square bullets, content width, logo, navigation, and footer match. | Pass with content fix |
| `/flatzinc/` | Visible text, headings, examples, and links match. | Long-form layout is within 11 px of the classical document height and has no overflow. | Pass |
| `/interfaces/` | Every current, external, and retired interface entry matches. | Restored resource title weight and compact item spacing now follow the classical list presentation. | Pass after style fix |
| `/license/` | License text matches. The empty classical headline `Gecode:` is corrected to `Gecode`; the agreement title is a proper `h2`. | Compact legal-text layout and sidebar geometry match. | Pass with empty-title fix |
| `/logo/` | Copy, logo variants, and download links match. | Original assets and grid presentation are retained; mobile wraps without overflow. | Pass |
| `/news/` | All 45 entries, dates, body copy, and links match. Entry headings are corrected from `h3` to `h2`; Håkan Kjellerstrand is no longer double-escaped. | The two-column date/content rhythm is preserved at desktop and collapses to one column on mobile. Document height matches. | Pass with semantic/entity fixes |
| `/projects/` | All project names, affiliations, descriptions, and links match. | Restored resource metadata and compact list spacing follow the classical presentation. | Pass after style fix |
| `/publications/` | All 11 publications and relations are present in the same order. “Selected publications” uses sentence case and spaces before punctuation are removed. | Classical single-column bibliography and sidebar geometry are preserved; document height matches. | Pass with typography/content fix |
| `/publications/2018-08-30-making-compact-table-compact/` | Title, authors, venue, abstract, and links match. | Publication template matches the classical prose layout. Article metadata is richer but invisible. | Pass |
| `/publications/2012-12-01-view-based-propagator-derivation/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2010-08-04-implementing-efficient-propagation-control/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2009-10-07-maintaining-state-in-propagation-solvers/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2009-06-17-weakly-monotonic-propagators/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2009-03-12-techniques-for-efficient-constraint-propagation/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2009-02-24-constraint-propagation---models--techniques--implementation/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2009-02-23-efficient-constraint-propagation-engines/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2007-07-04-advisors-for-incremental-propagation/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2006-09-08-views-and-iterators-for-generic-constraint-implementations/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |
| `/publications/2006-09-08-programming-constraint-services/` | Title, authors, venue, abstract, and links match. | Publication template and sidebar geometry match. | Pass |

## Generated-documentation spot checks

| Sample | Comparison | Result |
| --- | --- | --- |
| `/doc/6.4.0/reference/PageChange.html` | The content and Doxygen identity are preserved. The rewrite adds a viewport declaration, restores code folding, reserves the desktop right rail, and moves the navigation/footer into normal flow on narrow screens. The classical mobile page overflows and pins the navigation over the changelog; the fixed page does not. | Pass with required layout fix |
| `/doc/6.4.0/reference/index.html` | Reference landing content is preserved. The same current-generation viewport and responsive-shell fixes apply. | Pass with required layout fix |
| `/doc/6.4.0/reference/float_2val_8hpp_source.html` | Source content and title are preserved. Code folding is loaded explicitly and the source view remains within the viewport. | Pass with required script/layout fix |
| `/doc/6.2.0/reference/index.html` | Local and deployed archived files are unchanged. The old desktop rail remains classical; its known narrow-screen overlap is retained because the release is immutable. | Archival parity |
| `/doc/1.3.1/reference/index.html` | Local and deployed archived content is unchanged. Styling depends on the historical Doxygen generation and is intentionally not normalized. | Archival parity |

Only the current generated release is patched, and the corresponding template
fix exists in the Gecode source work so future releases inherit it. Historical
releases remain byte-stable; changing them in bulk would weaken their value as
release archives and introduce a much larger regression surface.

## Publication conclusion

The Astro version is visually conservative enough for publication. It keeps
the recognizable Gecode shell and content, fixes demonstrable defects, and
creates a maintainable base for later targeted design work. No radical redesign
is included in this branch.

The remaining publication work is operational: provision R2 and the Workers,
upload and verify immutable documentation releases, put `www.gecode.dev` behind
Cloudflare without changing its GitHub Pages origin, exercise a canary, and
then deploy the smaller `build:pages` artifact.
