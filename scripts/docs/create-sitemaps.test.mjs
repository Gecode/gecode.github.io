import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("writes a versioned sitemap index beside its shards", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gecode-sitemaps-"));
  const manifestPath = path.join(directory, "manifest.json");
  const outputDirectory = path.join(directory, "release");
  await writeFile(manifestPath, JSON.stringify({
    documentationVersion: "6.4.0",
    files: [{ path: "reference/index.html" }],
  }));

  await execFileAsync(process.execPath, [
    path.resolve("scripts/docs/create-sitemaps.mjs"),
    "--manifest", manifestPath,
    "--output", outputDirectory,
  ]);

  const index = await readFile(path.join(outputDirectory, "sitemap.xml"), "utf8");
  const shard = await readFile(path.join(outputDirectory, "sitemap-1.xml"), "utf8");
  assert.match(index, /https:\/\/www\.gecode\.dev\/doc\/6\.4\.0\/sitemap-1\.xml/);
  assert.match(shard, /https:\/\/www\.gecode\.dev\/doc\/6\.4\.0\/reference\/index\.html/);
});
