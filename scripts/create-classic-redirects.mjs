#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { activePageSlugs } from "../src/data/site.ts";
import { getPublications } from "../src/lib/legacy-content.ts";

// Workers Static Assets evaluates _redirects before matching files. The
// classic URL redirect Worker answers these paths first; these rules keep the
// redirects working when that Worker fails open, and give the canonical pages
// a permanent redirect when requested without the trailing slash.
const siteRoot = path.resolve(process.argv[2] ?? "_site");
const pages = [
  ...activePageSlugs.map((slug) => `/${slug}`),
  ...(await getPublications()).map((publication) => `/publications/${publication.slug}`),
];
const rules = [
  "/index.html / 308",
  ...pages.flatMap((page) => [`${page}.html ${page}/ 308`, `${page} ${page}/ 308`]),
];

await writeFile(path.join(siteRoot, "_redirects"), `${rules.join("\n")}\n`);
console.log(`Generated ${rules.length} classic URL redirect rules.`);
