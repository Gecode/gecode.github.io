# Gecode Website (Astro + GitHub Pages)

This repository hosts the Gecode website and is built with Astro, React islands,
and Tailwind CSS 4.

## Requirements

- Node.js `22.12` or newer (Node.js 24 is used in CI)
- npm

## Quick Start

1. Install Node dependencies:

```bash
npm ci
```

2. Start local development:

```bash
npm run dev
```

3. Build the site:

```bash
npm run build
```

## Quality Checks

Run the full CI-equivalent checks locally:

```bash
npm run check:quality
```

This command:

- builds the active Astro site
- checks executable-bit hygiene
- validates generated active-site HTML pages

For a deployment-equivalent build that also copies the frozen documentation
and mailing-list archives, run:

```bash
npm run build:deploy
```

The ordinary build intentionally omits those archives because they contain more
than 60,000 files and exceed 1 GB before compression.

## Notes on Scope

- `doc/` and `users-archive/` are treated as frozen historical archives.
- Active-page checks intentionally exclude those frozen archives.
- The Jekyll files remain temporarily as source for the compatibility content
  loader. They can be converted to native Astro content collections in a later,
  reviewable migration step.
