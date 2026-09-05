#!/usr/bin/env node
import { lstat, readdir, readlink, writeFile } from "node:fs/promises";
import path from "node:path";

async function measure(directory, extensions = new Map()) {
  let fileCount = 0;
  let totalBytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symbolic link below release root: ${filename}`);
    if (entry.isDirectory()) {
      const nested = await measure(filename, extensions);
      fileCount += nested.fileCount;
      totalBytes += nested.totalBytes;
    } else if (entry.isFile()) {
      const stat = await lstat(filename);
      const extension = path.extname(filename).toLowerCase() || "(none)";
      const totals = extensions.get(extension) ?? { fileCount: 0, totalBytes: 0 };
      totals.fileCount += 1;
      totals.totalBytes += stat.size;
      extensions.set(extension, totals);
      fileCount += 1;
      totalBytes += stat.size;
    }
  }
  return { fileCount, totalBytes, extensions };
}

const archiveRoot = path.resolve(process.argv[2] ?? "doc");
const output = process.argv[3];
if (!output) {
  console.error("Usage: inventory-archives.mjs <doc-directory> <output.json>");
  process.exit(2);
}

const releases = [];
const aliases = [];
for (const entry of (await readdir(archiveRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  const filename = path.join(archiveRoot, entry.name);
  if (entry.isSymbolicLink()) {
    aliases.push({ path: `doc/${entry.name}`, target: await readlink(filename) });
  } else if (entry.isDirectory()) {
    const measured = await measure(filename);
    releases.push({
      version: entry.name,
      fileCount: measured.fileCount,
      totalBytes: measured.totalBytes,
      extensions: Object.fromEntries([...measured.extensions].sort(([left], [right]) => left.localeCompare(right))),
    });
  }
}
const legacyAlias = path.join(path.dirname(archiveRoot), "doc-latest");
const legacyAliasStat = await lstat(legacyAlias).catch(() => null);
if (legacyAliasStat?.isSymbolicLink()) {
  aliases.push({ path: "doc-latest", target: await readlink(legacyAlias) });
}

const inventory = {
  schemaVersion: 1,
  totalReleases: releases.length,
  fileCount: releases.reduce((sum, release) => sum + release.fileCount, 0),
  totalBytes: releases.reduce((sum, release) => sum + release.totalBytes, 0),
  aliases,
  releases,
};
await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Inventoried ${inventory.fileCount} objects (${inventory.totalBytes} bytes) across ${inventory.totalReleases} releases`);
