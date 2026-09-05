#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { activePageSlugs } from "../src/data/site.ts";
import { getPublications } from "../src/lib/legacy-content.ts";

const siteRoot = path.resolve(process.argv[2] ?? "_site");
const redirectConfig = JSON.parse(await readFile(path.resolve("workers/redirects/wrangler.jsonc"), "utf8"));
const redirectPatterns = new Set(redirectConfig.env.production.routes.map((route) => route.pattern));
const routes = [
  { file: "index.html", canonical: "/" },
  ...activePageSlugs.map((slug) => ({ file: `${slug}/index.html`, canonical: `/${slug}/` })),
  ...(await getPublications()).map((publication) => ({
    file: `publications/${publication.slug}/index.html`,
    canonical: `/publications/${publication.slug}/`,
  })),
];

const failures = [];
for (const slug of activePageSlugs) {
  const pattern = slug === "publications"
    ? "www.gecode.dev/publications*"
    : `www.gecode.dev/${slug}.html*`;
  if (!redirectPatterns.has(pattern)) failures.push(`Missing redirect route: ${pattern}`);
}
if (!redirectPatterns.has("www.gecode.dev/index.html*")) failures.push("Missing redirect route: www.gecode.dev/index.html*");

for (const route of routes) {
  const html = await readFile(path.join(siteRoot, route.file), "utf8");
  const canonical = `https://www.gecode.dev${route.canonical}`;
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
    failures.push(`${route.file}: expected canonical ${canonical}`);
  }
  if (!html.includes(`<meta property="og:url" content="${canonical}"`)) {
    failures.push(`${route.file}: expected Open Graph URL ${canonical}`);
  }
}

for (const route of routes.filter((route) => route.file !== "index.html")) {
  const classicFile = route.file.replace(/\/index\.html$/, ".html");
  const html = await readFile(path.join(siteRoot, classicFile), "utf8");
  const destination = `https://www.gecode.dev${route.canonical}`;
  if (!html.includes(`<link rel="canonical" href="${destination}">`)) {
    failures.push(`${classicFile}: expected redirect canonical ${destination}`);
  }
  if (!html.includes(`http-equiv="refresh" content="0;url=${route.canonical}"`)) {
    failures.push(`${classicFile}: expected redirect to ${route.canonical}`);
  }
}

const activeHtmlPattern = new RegExp(`/(?:${activePageSlugs.join("|")})\\.html(?:[?#"'])`, "g");
const publicationHtmlPattern = /\/publications\/[^"'#?\s]+\.html(?:[?#"'])/g;
for (const route of routes) {
  const html = await readFile(path.join(siteRoot, route.file), "utf8");
  const matches = [
    ...(html.match(activeHtmlPattern) ?? []),
    ...(html.match(publicationHtmlPattern) ?? []),
  ];
  if (matches.length > 0) failures.push(`${route.file}: legacy internal links ${[...new Set(matches)].join(", ")}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Canonical URL check passed for ${routes.length} routes.`);
