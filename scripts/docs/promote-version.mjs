#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateVersion } from "./lib.mjs";
import { conditionalUploadArgs, publicationPaths, readRemoteFile, requireConditionalUploadSupport, runRclone, verifyRemoteManifest } from "./remote-lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const version = option("--version");
const remote = option("--remote");
const manifestPath = option("--manifest");
const buildId = option("--build-id");
const revision = option("--revision");
if (!version || !remote || !manifestPath || !buildId || !process.argv.includes("--confirm-promotion")) {
  console.error("Usage: promote-version.mjs --version <x.y.z> --manifest <file> --build-id <id> --remote <remote:bucket> [--revision <id>] --confirm-promotion");
  process.exit(2);
}
validateVersion(version);

const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
if (manifest.documentationVersion !== version) throw new Error("Manifest and requested versions do not match");
const { staging, production, manifest: remoteManifest } = publicationPaths(remote, version, { revision, buildId });
const uploadArgs = conditionalUploadArgs(manifest);

await requireConditionalUploadSupport();
const completed = await readRemoteFile(remoteManifest, { allowMissing: true });
if (completed !== null) {
  if (completed !== manifestText) throw new Error(`Completed version ${version} has a different manifest`);
  await verifyRemoteManifest(production, manifest);
  console.log(`Completed version ${version} verified; no publication needed.`);
  process.exit(0);
}

console.log(`Verifying staged release ${staging}`);
await verifyRemoteManifest(staging, manifest);
await verifyRemoteManifest(production, manifest, { allowPartial: true });
console.log(`Promoting ${staging} to immutable prefix ${production}`);
await runRclone(["copy", staging, production, "--checksum", "--fast-list", "--metadata", "--progress", ...uploadArgs]);
console.log(`Verifying promoted release ${production}`);
await verifyRemoteManifest(production, manifest);
console.log(`Persisting reviewed manifest at ${remoteManifest}`);
await runRclone(["copyto", manifestPath, remoteManifest, ...uploadArgs]);
if (await readRemoteFile(remoteManifest) !== manifestText) throw new Error("Persisted remote manifest differs from the reviewed manifest");
