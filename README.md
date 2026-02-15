# Gecode Website (Jekyll + GitHub Pages)

This repository hosts the Gecode website and is built with Jekyll and Tailwind CSS.

## Requirements

- Ruby `3.1.6` (or compatible `>= 3.1`)
- Bundler (for the selected Ruby version)
- Node.js `20.x`
- npm

## Quick Start

1. Install Node dependencies:

```bash
npm ci
```

2. Start local development (Tailwind watch + Jekyll serve):

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

- rebuilds CSS and site output
- verifies generated CSS is in sync with source
- checks executable-bit hygiene
- validates generated active-site HTML pages

## Notes on Scope

- `doc/` and `users-archive/` are treated as frozen historical archives.
- Active-page checks intentionally exclude those frozen archives.
