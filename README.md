<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/gecode-web-banner-dark.png">
    <img src="brand/gecode-web-banner-light.png" alt="Gecode website" width="640">
  </picture>
</p>

# Gecode Website (Astro + Cloudflare Workers)

This repository hosts the Gecode website and is built with Astro and Tailwind
CSS 4. React is available for future interactive islands, but the current site
does not require client-side JavaScript.

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
- checks content transformations, metadata, and canonical URLs
- validates the documentation and redirect Workers

For the deployed website, including the mailing-list archive but excluding
documentation served from R2, run:

```bash
npm run build:pages
```

The legacy rollback/comparison build still copies both frozen archives:

```bash
npm run build:deploy
```

That legacy artifact must not be used by the production workflow.

## Deployment

Pushes to `main` build the site and deploy `_site` to the `gecode-website`
Cloudflare Worker (static assets) on `www.gecode.dev`. See
[Website hosting and TLS](docs/operations.md#website-hosting-and-tls) for the
setup, rollback and monitoring.

## Notes on Scope

- `doc/` and `users-archive/` are treated as frozen historical archives.
- Active-page checks intentionally exclude those frozen archives.
- The Jekyll files remain temporarily as source for the compatibility content
  loader. They can be converted to native Astro content collections in a later,
  reviewable migration step.

## Migration Plans

- [Astro migration analysis](docs/astro-migration.md)
- [Classical site parity review](docs/classic-parity-review.md)
- [Deployment runbook](docs/deployment-runbook.md)
- [Static documentation hosting plan](docs/static-documentation-hosting.md)
