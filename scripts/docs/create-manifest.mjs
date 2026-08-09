#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createManifest } from "./lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const root = option("--root");
const version = option("--version");
const output = option("--output");
if (!root || !version || !output) {
  console.error("Usage: create-manifest.mjs --root <directory> --version <x.y.z> --output <file>");
  process.exit(2);
}

const manifest = await createManifest(path.resolve(root), version);
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.fileCount} objects (${manifest.totalBytes} bytes) to ${output}`);
