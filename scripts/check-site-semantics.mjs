#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getNews, getPublications } from "../src/lib/legacy-content.ts";

const siteRoot = path.resolve(process.argv[2] ?? "_site");
const failures = [];
const readOutput = (file) => readFile(path.join(siteRoot, file), "utf8");

const robots = await readOutput("robots.txt");
for (const match of robots.matchAll(/^Sitemap:\s+(\S+)$/gm)) {
  const sitemapPath = new URL(match[1]).pathname.replace(/^\//, "");
  // Documentation is served by the Cloudflare Worker, not the Pages artifact.
  // Its stable sitemap route is covered by the Worker integration tests.
  if (sitemapPath.startsWith("doc/")) continue;
  try {
    await readOutput(sitemapPath);
  } catch {
    failures.push(`robots.txt: missing advertised sitemap ${sitemapPath}`);
  }
}

const download = await readOutput("download/index.html");
if (/Download<\/h1>[\s\S]*?release-6\.4\.0\.tar\.gz\s+release-6\.4\.0\.zip/.test(download)) {
  failures.push("download/index.html: leaked Liquid capture values before the page content");
}

const news = await readOutput("news/index.html");
if (!news.includes("Håkan Kjellerstrand") || news.includes("H&amp;#229;kan")) {
  failures.push("news/index.html: expected decoded Håkan Kjellerstrand title");
}

const notFound = await readOutput("404.html");
if (!notFound.includes('<meta name="robots" content="noindex">')) {
  failures.push("404.html: missing noindex metadata");
}
if (notFound.includes('rel="canonical"') || notFound.includes('property="og:url"')) {
  failures.push("404.html: error document must not claim a canonical or Open Graph URL");
}

for (const publication of await getPublications()) {
  const html = await readOutput(`publications/${publication.slug}/index.html`);
  if (!html.includes('<meta property="og:type" content="article">')) {
    failures.push(`${publication.slug}: missing article Open Graph type`);
  }
  if (!html.includes(`property="article:published_time" content="${publication.publishedDate}"`)) {
    failures.push(`${publication.slug}: missing publication date metadata`);
  }
  if (!html.includes(`name="description" content="${publication.description.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`)) {
    failures.push(`${publication.slug}: missing publication description`);
  }
}

const activePages = [
  "index.html",
  "community/index.html",
  "disclaimer/index.html",
  "documentation/index.html",
  "download/index.html",
  "flatzinc/index.html",
  "interfaces/index.html",
  "license/index.html",
  "logo/index.html",
  "news/index.html",
  "projects/index.html",
  "publications/index.html",
];
for (const file of activePages) {
  const html = await readOutput(file);
  if (/\{%|{{/.test(html)) failures.push(`${file}: unresolved Liquid syntax`);
}

for (const item of await getNews()) {
  if (!news.includes(`id="${item.date}-${item.slug}"`)) failures.push(`news/index.html: missing news entry ${item.date}-${item.slug}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Semantic site checks passed.");
