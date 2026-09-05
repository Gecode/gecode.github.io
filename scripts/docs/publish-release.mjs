#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { conditionalUploadArgs, loadAndVerifyManifest, publicationPaths, readRemoteFile,
  requireConditionalUploadSupport, runRclone, verifyRemoteManifest } from "./remote-lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const root = option("--root");
const version = option("--version");
const revision = option("--revision");
const remote = option("--remote");
const manifestPath = option("--manifest");
const confirmed = process.argv.includes("--confirm-upload");
if (!root || !version || !remote || !manifestPath) {
  console.error("Usage: publish-release.mjs --root <directory> --version <x.y.z> [--revision <id>] --manifest <file> --remote <rclone-remote:bucket> [--confirm-upload]");
  process.exit(2);
}
const source = path.resolve(root);
const manifest = await loadAndVerifyManifest(manifestPath, source, version);
const manifestText = await readFile(manifestPath, "utf8");
const destination = publicationPaths(remote, version, { revision });
const uploadArgs = conditionalUploadArgs(manifest);
if (!confirmed) {
  console.log(`Dry run: verified ${manifest.fileCount} local objects; would publish directly to ${destination.production} and complete at ${destination.manifest}`);
  process.exit(0);
}

await requireConditionalUploadSupport();
const completed = await readRemoteFile(destination.manifest, { allowMissing: true });
if (completed !== null) {
  if (completed !== manifestText) throw new Error(`Completed publication ${version}${revision ? `/${revision}` : ""} has a different manifest`);
  await verifyRemoteManifest(destination.production, manifest);
  console.log("Completed publication verified; no upload needed.");
  process.exit(0);
}
await verifyRemoteManifest(destination.production, manifest, { allowPartial: true });
console.log(`Publishing local documentation directly to ${destination.production}`);
await runRclone(["copy", source, destination.production, "--checksum", "--fast-list", "--metadata", "--progress", ...uploadArgs]);
await verifyRemoteManifest(destination.production, manifest);
await runRclone(["copyto", manifestPath, destination.manifest, ...uploadArgs]);
if (await readRemoteFile(destination.manifest) !== manifestText) throw new Error("Persisted remote manifest differs from the reviewed manifest");
console.log(`Publication completed: ${destination.manifest}`);
