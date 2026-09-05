import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { contentType, createManifest, validateVersion } from "./lib.mjs";

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

export async function readRemoteFile(remotePath, { allowMissing = false } = {}) {
  // S3 cat may succeed with empty stdout for a missing virtual prefix. Stat
  // distinguishes that from an existing zero-byte completion object.
  const listing = await captureRclone(["lsjson", remotePath, "--stat"], { allowMissing });
  if (listing === null || JSON.parse(listing).IsDir !== false) {
    if (allowMissing) return null;
    throw new Error(`Remote file does not exist: ${remotePath}`);
  }
  return captureRclone(["cat", remotePath]);
}

export async function requireConditionalUploadSupport() {
  const version = (await captureRclone(["version"])).match(/^rclone v(\d+)\.(\d+)\./m);
  if (!version || Number(version[1]) < 1 || (Number(version[1]) === 1 && Number(version[2]) < 75)) {
    throw new Error("rclone 1.75.0 or newer is required for conditional R2 object writes");
  }
}

// Keep the public documentation keys stable; revisions select private R2 prefixes.
export function publicationPaths(remote, version, { revision, buildId } = {}) {
  const base = validateRemote(remote);
  validateVersion(version);
  if (revision !== undefined) validateBuildId(revision);
  return {
    production: revision ? `${base}/_revisions/${version}/${revision}` : `${base}/${version}`,
    manifest: revision ? `${base}/_manifests/${version}/${revision}.json` : `${base}/_manifests/${version}.json`,
    staging: buildId === undefined ? undefined : `${base}/staging/${validateBuildId(buildId)}/${version}${revision ? `/${revision}` : ""}`,
  };
}

export function conditionalUploadArgs(manifest) {
  // R2's conditional PutObject protects against concurrent writers. Force a
  // single PUT and disable CopyObject, whose destination conditions differ.
  if (manifest.files.some((file) => file.bytes >= 5 * 1024 ** 3)) {
    throw new Error("Conditional documentation publication requires each object to be smaller than 5 GiB");
  }
  return ["--immutable", "--ignore-existing", "--no-update-modtime",
    "--disable", "Copy", "--s3-upload-cutoff", "5G", "--header-upload", "If-None-Match: *"];
}

export async function loadAndVerifyManifest(manifestPath, root, version) {
  const expected = JSON.parse(await readFile(manifestPath, "utf8"));
  if (expected.documentationVersion !== version) {
    throw new Error(`Manifest version ${expected.documentationVersion} does not match ${version}`);
  }
  const actual = await createManifest(path.resolve(root), version);
  // SHA-256-only manifests remain valid for previously published archives.
  actual.files = actual.files.map((file, index) => {
    if (expected.files[index]?.md5 !== undefined) return file;
    const { md5, ...legacy } = file;
    return legacy;
  });
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("The source tree does not match the supplied manifest; regenerate and review it");
  }
  return expected;
}

export async function verifyRemoteManifest(remotePath, expectedManifest, { allowPartial = false } = {}) {
  const fastHashes = expectedManifest.files.every((file) => /^[a-f0-9]{32}$/.test(file.md5 ?? ""));
  // R2 exposes single-part MD5 in its listing. Asking for MIME or modification
  // time would turn this into a serial HEAD request for every object.
  const listing = JSON.parse(await captureRclone([
    "lsjson", remotePath, "--recursive", "--files-only", "--hash",
    ...(fastHashes ? ["--no-mimetype", "--no-modtime"] : ["--metadata"]),
  ], { allowMissing: allowPartial }) ?? "[]");
  const expectedByPath = new Map(expectedManifest.files.map((file) => [file.path, file]));
  const download = new Set();
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
  const verifyContentType = (remoteObject, expected) => {
    if (!compatibleContentType(remoteObject.MimeType, expected.contentType)) {
      if (/\.map$/i.test(expected.path) && contentType(expected.path) === "application/octet-stream"
        && mimeBase(expected.contentType) === "application/json"
        && mimeBase(remoteObject.MimeType) === "application/octet-stream") {
        legacyMaps.add(expected.path);
        download.add(expected.path);
      } else {
        throw new Error(`Remote content type differs for ${expected.path}: ${remoteObject.MimeType ?? "missing"}`);
      }
    }
  };
  const representatives = new Map();
  if (!allowPartial && listing.length !== expectedByPath.size) throw new Error(`Remote object count differs at ${remotePath}`);
  const seen = new Set();
  for (const remoteObject of listing) {
    const expected = expectedByPath.get(remoteObject.Path);
    if (!expected || seen.has(remoteObject.Path)) throw new Error(`Unexpected remote object: ${remoteObject.Path}`);
    seen.add(remoteObject.Path);
    if (remoteObject.Size !== expected.bytes) throw new Error(`Remote size differs: ${remoteObject.Path}`);
    if (fastHashes) {
      if (!representatives.has(expected.contentType)) representatives.set(expected.contentType, expected);
    } else {
      verifyContentType(remoteObject, expected);
    }
    const hashes = Object.fromEntries(Object.entries(remoteObject.Hashes ?? {})
      .map(([name, value]) => [name.toLowerCase().replaceAll("-", ""), value.toLowerCase()]));
    if (hashes.sha256) {
      if (hashes.sha256 !== expected.sha256) throw new Error(`Remote object differs from SHA-256 manifest: ${expected.path}`);
    } else if (expected.md5 && hashes.md5) {
      if (hashes.md5 !== expected.md5) throw new Error(`Remote object differs from MD5 manifest: ${expected.path}`);
    } else {
      download.add(expected.path);
    }
  }
  // Check actual HTTP metadata once per expected content type, while hashes,
  // sizes, and paths above are still checked for every object in the tree.
  for (const expected of representatives.values()) {
    const remoteObject = JSON.parse(await captureRclone(["lsjson", `${remotePath}/${expected.path}`, "--stat"]));
    if (remoteObject.IsDir !== false || remoteObject.Size !== expected.bytes) {
      throw new Error(`Remote representative object differs: ${expected.path}`);
    }
    verifyContentType(remoteObject, expected);
  }
  if (!download.size) return;

  // Normal R2 publications expose MD5 via ETag (or rclone's multipart metadata).
  // Only historical SHA-256-only or hashless objects need a download fallback.
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "gecode-doc-verify-"));
  try {
    for (const filename of download) {
      if (/^[\/]|[\\\r\n]/.test(filename) || filename.split("/").some((part) => part === ".." || part === ".")) {
        throw new Error(`Unsafe manifest path: ${filename}`);
      }
    }
    const listPath = path.join(temporaryDirectory, "files.txt");
    const destination = path.join(temporaryDirectory, "objects");
    await writeFile(listPath, [...download].join("\n") + "\n");
    console.log(`Downloading ${download.size} objects without comparable hashes or with historical map metadata`);
    await runRclone(["copy", remotePath, destination, "--files-from-raw", listPath, "--checksum", "--metadata"]);
    const actual = await createManifest(destination, expectedManifest.documentationVersion);
    if (actual.fileCount !== download.size) throw new Error(`Downloaded object count differs at ${remotePath}`);
    for (const file of actual.files) {
      const expected = expectedByPath.get(file.path);
      if (!expected || file.sha256 !== expected.sha256 || (expected.md5 && file.md5 !== expected.md5)) {
        throw new Error(`Remote tree ${remotePath} does not match the SHA-256 manifest: ${file.path}`);
      }
      if (legacyMaps.has(file.path)) {
        const body = await readFile(path.join(destination, file.path), "utf8");
        if (!/^(?:<(?:map|area)(?:\s|>)|base referer\r?\nrect\s)/.test(body)) {
          throw new Error(`Remote object does not match historical image-map format: ${file.path}`);
        }
      }
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
