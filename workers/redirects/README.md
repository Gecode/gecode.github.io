# Classic URL redirects

GitHub Pages serves a physical `community.html` file at both `/community` and
`/community.html`. That makes clean extensionless links possible, but Pages
cannot redirect the second URL while continuing to use the same file for the
first.

This Worker supplies that missing edge behavior. It returns a permanent `308`
from each classic active-site `.html` URL to its extensionless canonical URL,
preserving the query string. `/index.html` redirects to `/`. Publication detail
pages follow the same rule.

The Worker deliberately leaves these URLs alone:

- Doxygen pages below `/doc/` and `/doc-latest/`;
- mailing-list archive pages;
- external `.html` links.

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
