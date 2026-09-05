import { execFile } from "node:child_process";
import { access, cp, rm, stat } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const root = process.cwd();
const source = path.join(root, "users-archive");
const outputRoot = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--")) ?? "_site";
const target = path.join(root, outputRoot, "users-archive");
const reusePrepared = process.argv.includes("--if-present");

if (reusePrepared && await archiveReady(target)) {
  console.log("Reusing prepared users archive.");
} else {
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true, dereference: true });

  const pagefind = path.join(root, "node_modules", ".bin", "pagefind");
  await run(pagefind, [
    "--site", target,
    "--output-path", path.join(target, "pagefind"),
    "--root-selector", "[data-pagefind-body]",
  ]);
}

async function archiveReady(directory) {
  const required = [
    "index.html",
    "archive.css",
    "archive.js",
    "archive-index.json",
    "threads/005041.html",
    "pagefind/pagefind.js",
    "pagefind/pagefind-entry.json",
  ];
  const present = (await Promise.all(required.map(async (file) => {
    try {
      await access(path.join(directory, file));
      return true;
    } catch {
      return false;
    }
  }))).every(Boolean);
  if (!present) return false;

  return (await Promise.all([
    "index.html",
    "archive.css",
    "archive.js",
    "archive-index.json",
    "threads/005041.html",
    "2018-July/005044.html",
  ].map(async (file) => {
    try {
      return (await stat(path.join(directory, file))).mtimeMs >= (await stat(path.join(source, file))).mtimeMs;
    } catch {
      return false;
    }
  }))).every(Boolean);
}
