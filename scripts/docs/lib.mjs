import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

export function contentType(filename) {
  if (/\.(?:[cm]?js|css)\.map$/i.test(filename)) return "application/json; charset=utf-8";
  return contentTypes.get(path.extname(filename).toLowerCase()) ?? "application/octet-stream";
}

export function validateVersion(version) {
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version)) {
    throw new Error(`Invalid documentation version: ${version}`);
  }
  return version;
}

async function hashFile(filename) {
  const sha256 = createHash("sha256");
  const md5 = createHash("md5");
  for await (const chunk of createReadStream(filename)) {
    sha256.update(chunk);
    md5.update(chunk);
  }
  return { sha256: sha256.digest("hex"), md5: md5.digest("hex") };
}

async function findFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${filename}`);
    if (entry.isDirectory()) files.push(...await findFiles(root, filename));
    else if (entry.isFile()) files.push(filename);
    else throw new Error(`Unsupported archive entry: ${filename}`);
  }
  return files;
}

export async function createManifest(root, version) {
  validateVersion(version);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error(`Archive root is not a directory: ${root}`);

  const filenames = await findFiles(root);
  const files = [];
  let totalBytes = 0;
  for (const filename of filenames) {
    const stat = await lstat(filename);
    const relativePath = path.relative(root, filename).split(path.sep).join("/");
    totalBytes += stat.size;
    files.push({
      path: relativePath,
      key: `${version}/${relativePath}`,
      bytes: stat.size,
      ...await hashFile(filename),
      contentType: contentType(filename),
    });
  }

  return {
    schemaVersion: 1,
    documentationVersion: version,
    fileCount: files.length,
    totalBytes,
    files,
  };
}

export function sitemapDocuments(manifest, origin = "https://www.gecode.dev", limit = 40_000) {
  const escapeXml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");
  const pages = manifest.files.filter((file) => file.path.endsWith(".html"));
  const sitemaps = [];

  for (let offset = 0; offset < pages.length; offset += limit) {
    const urls = pages.slice(offset, offset + limit).map((file) => {
      const url = `${origin}/doc/${manifest.documentationVersion}/${encodePath(file.path)}`;
      return `  <url><loc>${escapeXml(url)}</loc></url>`;
    });
    sitemaps.push(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
  }
  return sitemaps;
}
