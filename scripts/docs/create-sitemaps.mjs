#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sitemapDocuments } from "./lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const manifestPath = option("--manifest");
const outputDirectory = option("--output");
const origin = option("--origin") ?? "https://www.gecode.dev";
if (!manifestPath || !outputDirectory) {
  console.error("Usage: create-sitemaps.mjs --manifest <file> --output <directory> [--origin <url>]");
  process.exit(2);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const documents = sitemapDocuments(manifest, origin);
await mkdir(outputDirectory, { recursive: true });

const names = [];
for (const [index, document] of documents.entries()) {
  const name = `sitemap-doc-${manifest.documentationVersion}-${index + 1}.xml`;
  await writeFile(path.join(outputDirectory, name), document);
  names.push(name);
}

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map((name) => `  <sitemap><loc>${origin}/${name}</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`;
await writeFile(path.join(outputDirectory, `sitemap-doc-${manifest.documentationVersion}.xml`), indexXml);
console.log(`Wrote ${documents.length} documentation sitemap(s) to ${outputDirectory}`);
