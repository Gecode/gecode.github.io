import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createManifest } from "./lib.mjs";
import { verifyRemoteManifest } from "./remote-lib.mjs";

let hasRclone = false;
try { execFileSync("rclone", ["version"], { stdio: "ignore" }); hasRclone = true; } catch {}

test("verifies legacy Graphviz map manifests without accepting arbitrary bytes or corrupted hashes", { skip: !hasRclone && "rclone is not installed" }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gecode-legacy-map-"));
  try {
    const mapPath = path.join(root, "graph.map");
    const legacyManifest = async (body) => {
      await writeFile(mapPath, body);
      const manifest = await createManifest(root, "1.3.1");
      manifest.files[0].contentType = "application/json; charset=utf-8";
      return manifest;
    };
    for (const body of [
      '<map id="graph">\n<area href="class.html">\n</map>\n',
      '<area shape="rect" href="class.html" coords="7,8,85,56">\n',
      "base referer\nrect class.html 7,8 85,56\n",
    ]) {
      const manifest = await legacyManifest(body);
      await verifyRemoteManifest(root, manifest);
      assert.equal(manifest.files[0].contentType, "application/json; charset=utf-8");
      const corrupt = structuredClone(manifest);
      corrupt.files[0].sha256 = "0".repeat(64);
      await assert.rejects(verifyRemoteManifest(root, corrupt), /SHA-256 manifest/);
    }
    const arbitrary = await legacyManifest("arbitrary data masquerading as a map\n");
    await assert.rejects(verifyRemoteManifest(root, arbitrary), /historical image-map format/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promotion preserves completed versions and resumes only matching partial uploads", { skip: !hasRclone && "rclone is not installed" }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gecode-promotion-"));
  try {
    const bucket = path.join(root, "bucket");
    const source = path.join(root, "source");
    const manifestPath = path.join(root, "manifest.json");
    await mkdir(source);
    await writeFile(path.join(source, "index.html"), "release");
    const version = "9.9.9";
    const staging = path.join(bucket, "staging", "attempt", version);
    const final = path.join(bucket, version);
    const completion = path.join(bucket, "_manifests", `${version}.json`);
    const env = { ...process.env, RCLONE_CONFIG_REVIEW_TYPE: "alias", RCLONE_CONFIG_REVIEW_REMOTE: root };
    const promote = () => execFileSync(process.execPath, [
      "scripts/docs/promote-version.mjs", "--version", version, "--remote", "review:bucket",
      "--manifest", manifestPath, "--build-id", "attempt", "--confirm-promotion",
    ], { env, stdio: "pipe" });
    const prepare = async () => {
      await writeFile(manifestPath, JSON.stringify(await createManifest(source, version)));
      await rm(staging, { recursive: true, force: true });
      await cp(source, staging, { recursive: true });
    };
    await prepare();
    promote();
    const original = await readFile(completion, "utf8");
    await rm(staging, { recursive: true });
    promote(); // Completed identical retries do not require staging.
    await writeFile(path.join(source, "extra.html"), "new page");
    await prepare();
    assert.throws(promote, /different manifest/);
    assert.equal(await readFile(completion, "utf8"), original);
    await assert.rejects(readFile(path.join(final, "extra.html")), { code: "ENOENT" });
    await rm(completion);
    await writeFile(path.join(final, "index.html"), "changed"); // same size
    assert.throws(promote, /SHA-256 manifest/);
    await assert.rejects(readFile(path.join(final, "extra.html")), { code: "ENOENT" });
    await writeFile(path.join(final, "index.html"), "release");
    promote();
    assert.equal(await readFile(path.join(final, "extra.html"), "utf8"), "new page");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("direct publication keeps revisions immutable and leaves legacy versions untouched", { skip: !hasRclone && "rclone is not installed" }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gecode-direct-publication-"));
  try {
    const source = path.join(root, "source");
    const manifestPath = path.join(root, "manifest.json");
    const bucket = path.join(root, "bucket");
    const version = "6.4.0";
    await mkdir(source);
    await mkdir(path.join(bucket, version), { recursive: true });
    await writeFile(path.join(bucket, version, "index.html"), "legacy");
    const env = { ...process.env, RCLONE_CONFIG_REVIEW_TYPE: "alias", RCLONE_CONFIG_REVIEW_REMOTE: root };
    const publish = (revision, confirmed = true) => execFileSync(process.execPath, [
      "scripts/docs/publish-release.mjs", "--root", source, "--version", version,
      "--revision", revision, "--manifest", manifestPath, "--remote", "review:bucket",
      ...(confirmed ? ["--confirm-upload"] : []),
    ], { env, stdio: "pipe", encoding: "utf8" });
    await writeFile(path.join(source, "index.html"), "first revision");
    await writeFile(manifestPath, JSON.stringify(await createManifest(source, version)));
    publish("first", false);
    await assert.rejects(readFile(path.join(bucket, "_revisions", version, "first", "index.html")), { code: "ENOENT" });
    publish("first");
    assert.match(publish("first"), /no upload needed/);
    await writeFile(path.join(source, "index.html"), "second revision");
    await writeFile(manifestPath, JSON.stringify(await createManifest(source, version)));
    assert.throws(() => publish("first"), /different manifest/);
    publish("second");
    assert.equal(await readFile(path.join(bucket, version, "index.html"), "utf8"), "legacy");
    assert.equal(await readFile(path.join(bucket, "_revisions", version, "first", "index.html"), "utf8"), "first revision");
    assert.equal(await readFile(path.join(bucket, "_revisions", version, "second", "index.html"), "utf8"), "second revision");
    assert.equal(await readFile(path.join(bucket, "_manifests", version, "second.json"), "utf8"), await readFile(manifestPath, "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verifies every MD5 with a fast listing and samples MIME once per content type", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gecode-md5-listing-"));
  const originalPath = process.env.PATH;
  try {
    const source = path.join(root, "source");
    await mkdir(source);
    await writeFile(path.join(source, "index.html"), "release");
    await writeFile(path.join(source, "second.html"), "another");
    await writeFile(path.join(source, "style.css"), "body{}");
    const manifest = await createManifest(source, "6.4.0");
    const listing = manifest.files.map((file) => ({ Path: file.path, Size: file.bytes, Hashes: { MD5: file.md5 } }));
    const stats = manifest.files.map((file) => ({ Path: file.path, Size: file.bytes, MimeType: file.contentType, IsDir: false }));
    const log = path.join(root, "commands.jsonl");
    const fake = path.join(root, "rclone");
    await writeFile(fake, `#!${process.execPath}
const args = process.argv.slice(2);
require("node:fs").appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + "\\n");
if (args[0] !== "lsjson") { console.error("Unexpected object download"); process.exit(77); }
if (args.includes("--stat")) {
  console.log(JSON.stringify(${JSON.stringify(stats)}.find((file) => args[1] === "test:bucket/" + file.Path)));
} else {
  if (!["--recursive", "--files-only", "--hash", "--no-mimetype", "--no-modtime"].every((flag) => args.includes(flag)) || args.includes("--metadata")) process.exit(78);
  console.log(${JSON.stringify(JSON.stringify(listing))});
}
`);
    await chmod(fake, 0o755);
    process.env.PATH = `${root}:${originalPath}`;
    await verifyRemoteManifest("test:bucket", manifest);
    const calls = (await readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(calls.length, 3);
    assert.equal(calls.filter((args) => args.includes("--stat")).length, 2);
    const corrupt = structuredClone(manifest);
    corrupt.files.find((file) => file.path === "second.html").md5 = "0".repeat(32);
    await assert.rejects(verifyRemoteManifest("test:bucket", corrupt), /MD5 manifest/);
    const wrongMime = structuredClone(manifest);
    wrongMime.files.find((file) => file.path === "style.css").contentType = "text/plain";
    await assert.rejects(verifyRemoteManifest("test:bucket", wrongMime), /Remote content type differs/);
  } finally {
    process.env.PATH = originalPath;
    await rm(root, { recursive: true, force: true });
  }
});
