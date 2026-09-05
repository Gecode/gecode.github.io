import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createManifest } from "./lib.mjs";

let hasRclone = false;
try { execFileSync("rclone", ["version"], { stdio: "ignore" }); hasRclone = true; } catch {}

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
