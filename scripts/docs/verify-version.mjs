#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateVersion } from "./lib.mjs";
import { publicationPaths, verifyRemoteManifest } from "./remote-lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const version = option("--version");
const remote = option("--remote");
const manifestPath = option("--manifest");
const buildId = option("--build-id");
const revision = option("--revision");
const final = process.argv.includes("--final");
if (!version || !remote || !manifestPath || (!buildId && !final) || (buildId && final)) {
  console.error("Usage: verify-version.mjs --version <x.y.z> --manifest <file> --remote <remote:bucket> [--revision <id>] (--build-id <id> | --final)");
  process.exit(2);
}
validateVersion(version);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.documentationVersion !== version) throw new Error("Manifest and requested versions do not match");
const paths = publicationPaths(remote, version, { revision, buildId });
const source = final ? paths.production : paths.staging;
console.log(`Verifying object metadata and available hashes in ${source}`);
await verifyRemoteManifest(source, manifest);
console.log(`Verified ${manifest.fileCount} objects against the manifest`);
