import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createManifest, sitemapDocuments, validateVersion } from "./lib.mjs";
import { loadAndVerifyManifest, validateBuildId, validateRemote } from "./remote-lib.mjs";

test("creates a sorted, content-addressed version manifest", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gecode-manifest-"));
  await mkdir(path.join(root, "reference"));
  await writeFile(path.join(root, "z.css"), "body{}\n");
  await writeFile(path.join(root, "reference", "index.html"), "<h1>Docs</h1>\n");

  const manifest = await createManifest(root, "6.4.0");
  assert.equal(manifest.fileCount, 2);
  assert.deepEqual(manifest.files.map((file) => file.path), ["reference/index.html", "z.css"]);
  assert.equal(manifest.files[0].key, "6.4.0/reference/index.html");
  assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.files[0].contentType, "text/html; charset=utf-8");
});

test("refuses symlinks in immutable releases", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gecode-manifest-link-"));
  await writeFile(path.join(root, "target.html"), "target");
  await symlink("target.html", path.join(root, "alias.html"));
  await assert.rejects(createManifest(root, "6.4.0"), /Refusing symbolic link/);
});

test("splits and escapes documentation sitemaps", () => {
  const manifest = {
    documentationVersion: "6.4.0",
    files: [
      { path: "reference/A&B.html" },
      { path: "reference/Second.html" },
      { path: "asset.css" },
    ],
  };
  const documents = sitemapDocuments(manifest, "https://www.gecode.dev", 1);
  assert.equal(documents.length, 2);
  assert.match(documents[0], /A%26B\.html/);
  assert.doesNotMatch(documents[0], /asset\.css/);
});

test("binds publishing inputs to the reviewed manifest", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "gecode-publish-manifest-"));
  const root = path.join(temporaryDirectory, "release");
  await mkdir(root);
  const manifestPath = path.join(temporaryDirectory, "manifest.json");
  await writeFile(path.join(root, "index.html"), "release");
  const manifest = await createManifest(root, "6.4.0");
  await writeFile(manifestPath, JSON.stringify(manifest));

  await loadAndVerifyManifest(manifestPath, root, "6.4.0");
  await writeFile(path.join(root, "index.html"), "changed");
  await assert.rejects(loadAndVerifyManifest(manifestPath, root, "6.4.0"), /does not match/);
});

test("validates remote and build identifiers", () => {
  assert.equal(validateRemote("r2:gecode-documentation/"), "r2:gecode-documentation");
  assert.equal(validateBuildId("release-6.4.0_123"), "release-6.4.0_123");
  assert.throws(() => validateRemote("/tmp/bucket"), /explicit rclone remote/);
  assert.throws(() => validateBuildId("../release"), /Invalid build ID/);
  assert.equal(validateVersion("6.5.0-rc.1"), "6.5.0-rc.1");
  assert.throws(() => validateVersion("../6.5.0"), /Invalid documentation version/);
});
