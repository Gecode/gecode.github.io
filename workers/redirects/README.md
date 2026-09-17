# Classic URL redirects and analytics proxy

The active Astro site uses directory output, so GitHub Pages serves
`community/index.html` at the canonical `/community/` URL and redirects
`/community` to that directory form. A separate `community.html` fallback page
preserves compatibility before the edge Worker is deployed.

This Worker supplies that missing edge behavior. It returns a permanent `308`
from each classic active-site `.html` URL to its trailing-slash canonical URL,
preserving the query string. `/index.html` redirects to `/`. Publication detail
pages follow the same rule.

The Worker deliberately leaves these URLs alone:

- Doxygen pages below `/doc/` and `/doc-latest/`;
- mailing-list archive pages;
- external `.html` links.

The same Worker owns `/e/*`, a first-party reverse proxy for the PostHog EU
ingestion and asset hosts. `/e/init.js` initializes analytics in PostHog's
always-cookieless mode and disables person profiles, surveys, and session
recording. It captures page navigation rather than clicks or form activity.
The initialization response adds Cloudflare's coarse ISO country and continent
codes as `gecode_country_code` and `gecode_continent_code` event properties.
It is never cached, and no city, coordinates, postal code, or raw IP address is
added to the event.
The Astro layout loads that script directly; the documentation
Worker adds it to Doxygen and MPG HTML responses without modifying the stored
release artifacts.

Set `POSTHOG_PROJECT_TOKEN` as a Worker secret before production deployment:

```sh
npx wrangler secret put POSTHOG_PROJECT_TOKEN \
  --env production --config workers/redirects/wrangler.jsonc
```

The production GitHub workflow does this automatically from the
`POSTHOG_PROJECT_TOKEN` secret in its `cloudflare-production` environment.

The token is public by design, but keeping it out of the repository makes it
possible to change projects without rebuilding the site. Cookieless mode must
also be enabled in the PostHog project settings; PostHog discards cookieless
events otherwise.

The production configuration uses exact top-level routes plus the
`/publications` prefix. Clean publication requests pass through to the GitHub
Pages origin. Cloudflare route subrequests reach that origin without invoking
the same route again.

Validate locally with:

```sh
npm run test:redirect-worker
npm run check:redirect-worker
```

Deploy only after `www.gecode.dev` is proxied through Cloudflare:

```sh
npx wrangler deploy --env production --config workers/redirects/wrangler.jsonc
```

The Doxygen R2 Worker has more-specific `/doc` routes, so generated
documentation keeps its established `.html` paths.
