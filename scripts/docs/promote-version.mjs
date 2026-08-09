#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateVersion } from "./lib.mjs";
import { readRemoteFile, runRclone, validateBuildId, validateRemote, verifyRemoteManifest } from "./remote-lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const version = option("--version");
const remote = option("--remote");
const manifestPath = option("--manifest");
const buildId = option("--build-id");
if (!version || !remote || !manifestPath || !buildId || !process.argv.includes("--confirm-promotion")) {
  console.error("Usage: promote-version.mjs --version <x.y.z> --manifest <file> --build-id <id> --remote <remote:bucket> --confirm-promotion");
  process.exit(2);
}
validateVersion(version);

const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
if (manifest.documentationVersion !== version) throw new Error("Manifest and requested versions do not match");
const base = validateRemote(remote);
const staging = `${base}/staging/${validateBuildId(buildId)}/${version}`;
const production = `${base}/${version}`;

console.log(`Verifying staged release ${staging}`);
await verifyRemoteManifest(staging, manifest);
console.log(`Promoting ${staging} to immutable prefix ${production}`);
await runRclone(["copy", staging, production, "--checksum", "--fast-list", "--immutable", "--metadata", "--progress"]);
console.log(`Verifying promoted release ${production}`);
await verifyRemoteManifest(production, manifest);
const remoteManifest = `${base}/_manifests/${version}.json`;
console.log(`Persisting reviewed manifest at ${remoteManifest}`);
await runRclone(["copyto", manifestPath, remoteManifest, "--immutable"]);
if (await readRemoteFile(remoteManifest) !== manifestText) throw new Error("Persisted remote manifest differs from the reviewed manifest");
