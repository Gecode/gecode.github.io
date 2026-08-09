#!/usr/bin/env node
import { lstat } from "node:fs/promises";
import path from "node:path";
import { validateVersion } from "./lib.mjs";
import { loadAndVerifyManifest, runRclone, validateBuildId, validateRemote } from "./remote-lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const root = option("--root");
const version = option("--version");
const remote = option("--remote");
const manifest = option("--manifest");
const buildId = option("--build-id");
const confirmed = process.argv.includes("--confirm-upload");
if (!root || !version || !remote || !manifest || !buildId) {
  console.error("Usage: publish-version.mjs --root <directory> --version <x.y.z> --manifest <file> --build-id <id> --remote <rclone-remote:bucket> [--confirm-upload]");
  process.exit(2);
}
validateVersion(version);

const source = path.resolve(root);
const stat = await lstat(source);
if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Archive root is not a directory: ${source}`);
await loadAndVerifyManifest(manifest, source, version);

const destination = `${validateRemote(remote)}/staging/${validateBuildId(buildId)}/${version}`;
const args = [
  "copy",
  source,
  destination,
  "--checksum",
  "--fast-list",
  "--immutable",
  "--metadata",
  "--progress",
];
if (!confirmed) args.push("--dry-run");

console.log(`${confirmed ? "Uploading" : "Dry run for"} immutable documentation ${version} to ${destination}`);
await runRclone(args);
