import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { versions } from "../data/site";

const root = process.cwd();

export interface LegacyPage {
  data: Record<string, unknown>;
  body: string;
}

export interface NewsItem {
  slug: string;
  date: string;
  title: string;
  body: string;
}

export interface Publication {
  slug: string;
  title: string;
  authors: Array<{ name: string; url?: string }>;
  howpublished: string;
  shorthowpub: string;
  relation?: string;
  link?: { label: string; url: string };
  copyright_text?: string;
  copyright_url?: string;
  copyright_label?: string;
  body: string;
}

function stripHtmlExtension(value: string): string {
  return value.replace(/\.html$/, "");
}

function renderLiquid(source: string): string {
  let html = source;

  html = html.replace(/\{%\s*(?:assign|capture)[\s\S]*?%\}/g, "");
  html = html.replace(/\{%\s*endcapture\s*%\}/g, "");
  html = html.replace(
    /\{%\s*include\s+download-src\.html\s+link=GECODESOURCETGZ\s*%\}/g,
    `<a href="https://github.com/Gecode/gecode/archive/refs/tags/release-${versions.release}.tar.gz"><code>release-${versions.release}.tar.gz</code></a>`,
  );
  html = html.replace(
    /\{%\s*include\s+download-src\.html\s+link=GECODESOURCEZIP\s*%\}/g,
    `<a href="https://github.com/Gecode/gecode/archive/refs/tags/release-${versions.release}.zip"><code>release-${versions.release}.zip</code></a>`,
  );

  html = html
    .replaceAll("{{ GECODESTAMP }}", versions.release)
    .replaceAll("{{ GECODECLEARDATE }}", versions.releaseDateLong)
    .replaceAll("{{ GECODEDOCSTAMP }}", versions.documentation);

  html = html.replace(
    /\{\{\s*'([^']+)'\s*\|\s*append:\s*GECODEDOCSTAMP\s*\|\s*append:\s*'([^']+)'\s*\|\s*relative_url\s*\}\}/g,
    (_, before: string, after: string) => `${before}${versions.documentation}${after}`,
  );
  html = html.replace(
    /\{\{\s*'([^']+)'\s*\|\s*relative_url\s*\}\}/g,
    (_, href: string) => href,
  );

  return html.trim();
}

export async function loadLegacyPage(filename: string): Promise<LegacyPage> {
  const raw = await readFile(path.join(root, filename), "utf8");
  const parsed = matter(raw);

  return {
    data: parsed.data,
    body: renderLiquid(parsed.content),
  };
}

export async function getNews(): Promise<NewsItem[]> {
  const directory = path.join(root, "_news");
  const filenames = (await readdir(directory)).filter((name) => name.endsWith(".html"));
  const items = await Promise.all(
    filenames.map(async (filename) => {
      const parsed = matter(await readFile(path.join(directory, filename), "utf8"));
      return {
        slug: stripHtmlExtension(filename.slice(11)),
        date: filename.slice(0, 10),
        title: String(parsed.data.title),
        body: renderLiquid(parsed.content),
      };
    }),
  );

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPublications(): Promise<Publication[]> {
  const directory = path.join(root, "_publications");
  const filenames = (await readdir(directory)).filter((name) => name.endsWith(".html"));
  const items = await Promise.all(
    filenames.map(async (filename) => {
      const parsed = matter(await readFile(path.join(directory, filename), "utf8"));
      return {
        slug: stripHtmlExtension(filename),
        title: String(parsed.data.title),
        authors: parsed.data.authors ?? [],
        howpublished: String(parsed.data.howpublished ?? ""),
        shorthowpub: String(parsed.data.shorthowpub ?? ""),
        relation: parsed.data.relation ? String(parsed.data.relation) : undefined,
        link: parsed.data.link,
        copyright_text: parsed.data.copyright_text,
        copyright_url: parsed.data.copyright_url,
        copyright_label: parsed.data.copyright_label,
        body: renderLiquid(parsed.content),
      } satisfies Publication;
    }),
  );

  return items.sort((a, b) => b.slug.localeCompare(a.slug));
}
