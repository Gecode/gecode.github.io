#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { activePageSlugs, site } from "../src/data/site.ts";
import { getPublications } from "../src/lib/legacy-content.ts";

const siteRoot = path.resolve(process.argv[2] ?? "_site");
const redirects = [
  ...activePageSlugs.map((slug) => ({ source: `${slug}.html`, destination: `/${slug}/` })),
  ...(await getPublications()).map((publication) => ({
    source: `publications/${publication.slug}.html`,
    destination: `/publications/${publication.slug}/`,
  })),
];

for (const redirect of redirects) {
  const filename = path.join(siteRoot, redirect.source);
  const canonical = new URL(redirect.destination, site.url).href;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0;url=${redirect.destination}">
    <link rel="canonical" href="${canonical}">
    <title>Redirecting…</title>
    <script>location.replace(${JSON.stringify(redirect.destination)} + location.search + location.hash)</script>
  </head>
  <body>
    <p><a href="${redirect.destination}">Continue to the current Gecode page</a>.</p>
  </body>
</html>
`;
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, html);
}

console.log(`Generated ${redirects.length} classic URL fallback redirects.`);
