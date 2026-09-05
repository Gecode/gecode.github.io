import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { contentType, createManifest } from "./lib.mjs";

export function validateRemote(remote) {
  if (!/^[A-Za-z0-9_-]+:[^/].*$/.test(remote)) {
    throw new Error("The remote must be an explicit rclone remote and bucket, for example r2:gecode-documentation");
  }
  return remote.replace(/\/$/, "");
}

export function validateBuildId(buildId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(buildId)) throw new Error(`Invalid build ID: ${buildId}`);
  return buildId;
}

export async function runRclone(args) {
  const child = spawn("rclone", args, { stdio: "inherit" });
  child.on("error", (error) => {
    if (error.code === "ENOENT") console.error("rclone is required: https://rclone.org/install/");
    else console.error(error.message);
  });
  const exitCode = await new Promise((resolve) => child.on("close", resolve));
  if (exitCode !== 0) throw new Error(`rclone exited with status ${exitCode ?? "unknown"}`);
}

async function captureRclone(args, { allowMissing = false } = {}) {
  const child = spawn("rclone", args, { stdio: ["ignore", "pipe", "inherit"] });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  if (allowMissing && (exitCode === 3 || exitCode === 4)) return null;
  if (exitCode !== 0) throw new Error(`rclone exited with status ${exitCode ?? "unknown"}`);
  return output;
}

export async function readRemoteFile(remotePath, options) {
  return captureRclone(["cat", remotePath], options);
}

export async function requireConditionalUploadSupport() {
  const version = (await captureRclone(["version"])).match(/^rclone v(\d+)\.(\d+)\./m);
  if (!version || Number(version[1]) < 1 || (Number(version[1]) === 1 && Number(version[2]) < 75)) {
    throw new Error("rclone 1.75.0 or newer is required for conditional R2 manifest writes");
  }
}

export async function loadAndVerifyManifest(manifestPath, root, version) {
  const expected = JSON.parse(await readFile(manifestPath, "utf8"));
  if (expected.documentationVersion !== version) {
    throw new Error(`Manifest version ${expected.documentationVersion} does not match ${version}`);
  }
  const actual = await createManifest(path.resolve(root), version);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("The source tree does not match the supplied manifest; regenerate and review it");
  }
  return expected;
}

export async function verifyRemoteManifest(remotePath, expectedManifest, { allowPartial = false } = {}) {
  const listing = JSON.parse(await captureRclone([
    "lsjson",
    remotePath,
    "--recursive",
    "--files-only",
    "--metadata",
    "--hash",
  ], { allowMissing: allowPartial }) ?? "[]");
  const expectedByPath = new Map(expectedManifest.files.map((file) => [file.path, file]));
  const legacyMaps = new Set();
  const mimeBase = (value) => value?.split(";", 1)[0].trim().toLowerCase();
  const compatibleContentType = (actual, expected) => {
    if (expected === "application/octet-stream") return Boolean(actual);
    const actualBase = mimeBase(actual);
    const expectedBase = mimeBase(expected);
    if (actualBase === expectedBase) return true;
    return new Set([actualBase, expectedBase]).size === 2
      && [actualBase, expectedBase].every((value) => value === "text/javascript" || value === "application/javascript");
  };
  if (!allowPartial && listing.length !== expectedByPath.size) throw new Error(`Remote object count differs at ${remotePath}`);
  for (const remoteObject of listing) {
    const expected = expectedByPath.get(remoteObject.Path);
    if (!expected) throw new Error(`Unexpected remote object: ${remoteObject.Path}`);
    if (remoteObject.Size !== expected.bytes) throw new Error(`Remote size differs: ${remoteObject.Path}`);
    if (!compatibleContentType(remoteObject.MimeType, expected.contentType)) {
      if (/\.map$/i.test(expected.path) && contentType(expected.path) === "application/octet-stream"
        && mimeBase(expected.contentType) === "application/json"
        && mimeBase(remoteObject.MimeType) === "application/octet-stream") {
        legacyMaps.add(expected.path);
      } else {
        throw new Error(`Remote content type differs for ${remoteObject.Path}: ${remoteObject.MimeType ?? "missing"}`);
      }
    }
  }

  if (allowPartial) {
    const present = new Set(listing.map((object) => object.Path));
    const files = expectedManifest.files.filter((file) => present.has(file.path));
    expectedManifest = { ...expectedManifest, files, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) };
    if (files.length === 0) return;
  }

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "gecode-doc-verify-"));
  try {
    await runRclone(["copy", remotePath, temporaryDirectory, "--checksum", "--fast-list", "--metadata", "--progress"]);
    const actual = await createManifest(temporaryDirectory, expectedManifest.documentationVersion);
    // Historical manifests mislabeled Graphviz image maps as JSON. Accept only
    // recognizable map content whose downloaded bytes still match the manifest.
    for (const file of actual.files) {
      if (!legacyMaps.has(file.path)) continue;
      const body = await readFile(path.join(temporaryDirectory, file.path), "utf8");
      const expected = expectedByPath.get(file.path);
      if (!/^(?:<(?:map|area)(?:\s|>)|base referer\r?\nrect\s)/.test(body) || file.sha256 !== expected.sha256) {
        throw new Error(`Remote tree ${remotePath} does not match the SHA-256 manifest or historical image-map format: ${file.path}`);
      }
    }
    expectedManifest = {
      ...expectedManifest,
      files: expectedManifest.files.map((file) => legacyMaps.has(file.path)
        ? { ...file, contentType: "application/octet-stream" } : file),
    };
    if (JSON.stringify(actual) !== JSON.stringify(expectedManifest)) {
      throw new Error(`Remote tree ${remotePath} does not match the SHA-256 manifest`);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
