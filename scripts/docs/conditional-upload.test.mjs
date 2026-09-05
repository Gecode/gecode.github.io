import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { conditionalUploadArgs, publicationPaths, readRemoteFile } from "./remote-lib.mjs";

let hasRclone = false;
try { execFileSync("rclone", ["version"], { stdio: "ignore" }); hasRclone = true; } catch {}

test("revision paths retain legacy prefixes and reject path traversal", () => {
  assert.deepEqual(publicationPaths("r2:docs", "6.4.0", { buildId: "job" }), {
    production: "r2:docs/6.4.0", manifest: "r2:docs/_manifests/6.4.0.json", staging: "r2:docs/staging/job/6.4.0",
  });
  assert.deepEqual(publicationPaths("r2:docs", "6.4.0", { revision: "20260905-rst", buildId: "job" }), {
    production: "r2:docs/_revisions/6.4.0/20260905-rst",
    manifest: "r2:docs/_manifests/6.4.0/20260905-rst.json",
    staging: "r2:docs/staging/job/6.4.0/20260905-rst",
  });
  for (const revision of ["../x", "x/y", "", "..", "/x"]) {
    assert.throws(() => publicationPaths("r2:docs", "6.4.0", { revision }), /Invalid build ID/);
  }
  assert.throws(() => conditionalUploadArgs({ files: [{ bytes: 5 * 1024 ** 3 }] }), /smaller than 5 GiB/);
});

test("rclone sends an atomic destination condition when an object appears after its initial check", { skip: !hasRclone && "rclone is not installed", timeout: 30_000 }, async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "gecode-conditional-put-"));
  const requests = [];
  let stored = "concurrent writer";
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, headers: request.headers });
    request.resume();
    if (request.method === "HEAD") {
      response.writeHead(request.url === "/bucket" ? 200 : 404);
    } else if (request.method === "PUT" && request.url.split("?", 1)[0] === "/bucket/index.html") {
      // The HEAD observed no object; another publisher completed before PUT.
      if (request.headers["if-none-match"] === "*") {
        response.writeHead(412, { "content-type": "application/xml" });
        response.end("<Error><Code>PreconditionFailed</Code><Message>Already exists</Message></Error>");
        return;
      }
      stored = "overwritten";
      response.writeHead(200);
    } else {
      response.writeHead(200, { "content-type": "application/xml" });
    }
    response.end();
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const filename = path.join(temporary, "index.html");
    await writeFile(filename, "new writer");
    const child = spawn("rclone", ["copyto", filename, "race:bucket/index.html",
      "--retries", "1", "--low-level-retries", "1", "--s3-no-check-bucket",
      ...conditionalUploadArgs({ files: [{ bytes: 10 }] }),
    ], { env: { ...process.env,
      RCLONE_CONFIG_RACE_TYPE: "s3", RCLONE_CONFIG_RACE_PROVIDER: "Other",
      RCLONE_CONFIG_RACE_ACCESS_KEY_ID: "test", RCLONE_CONFIG_RACE_SECRET_ACCESS_KEY: "test",
      RCLONE_CONFIG_RACE_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    }, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const status = await new Promise((resolve, reject) => { child.on("close", resolve); child.on("error", reject); });
    assert.notEqual(status, 0, stderr);
    const uploads = requests.filter((request) => request.method === "PUT" && request.url.split("?", 1)[0] === "/bucket/index.html");
    assert.ok(uploads.length > 0, JSON.stringify(requests) + stderr);
    assert.ok(uploads.every((request) => request.headers["if-none-match"] === "*"));
    assert.ok(uploads.every((request) => !request.headers["x-amz-copy-source"]));
    assert.equal(stored, "concurrent writer");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
  }
});

test("S3 completion lookup distinguishes a missing virtual prefix from an empty object", { skip: !hasRclone && "rclone is not installed", timeout: 30_000 }, async () => {
  const server = createServer((request, response) => {
    request.resume();
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/bucket/empty.json") {
      response.writeHead(200, { "content-length": "0", etag: '"d41d8cd98f00b204e9800998ecf8427e"', "last-modified": "Sat, 05 Sep 2026 12:00:00 GMT" });
      response.end();
    } else if (request.method === "HEAD") {
      response.writeHead(404);
      response.end();
    } else {
      response.writeHead(200, { "content-type": "application/xml" });
      response.end('<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>bucket</Name><Prefix>missing.json/</Prefix><KeyCount>0</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>');
    }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const configuration = {
    RCLONE_CONFIG_LOOKUP_TYPE: "s3", RCLONE_CONFIG_LOOKUP_PROVIDER: "Other",
    RCLONE_CONFIG_LOOKUP_ACCESS_KEY_ID: "test", RCLONE_CONFIG_LOOKUP_SECRET_ACCESS_KEY: "test",
    RCLONE_CONFIG_LOOKUP_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
  };
  const previous = Object.fromEntries(Object.keys(configuration).map((name) => [name, process.env[name]]));
  Object.assign(process.env, configuration);
  try {
    assert.equal(await readRemoteFile("lookup:bucket/missing.json", { allowMissing: true }), null);
    await assert.rejects(readRemoteFile("lookup:bucket/missing.json"), /does not exist/);
    assert.equal(await readRemoteFile("lookup:bucket/empty.json", { allowMissing: true }), "");
    assert.equal(await readRemoteFile("lookup:bucket/empty.json"), "");
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  }
});
