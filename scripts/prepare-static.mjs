import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, ".astro-public");
const entries = ["images", "papers", "download", "CNAME", "robots.txt"];
const incremental = process.argv.includes("--incremental");

// Production builds must not inherit an archive prepared by the dev server.
if (!incremental) await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const entry of entries) {
  const destination = path.join(target, entry);
  if (incremental && await exists(destination)) continue;

  await rm(destination, { recursive: true, force: true });

  await cp(path.join(root, entry), path.join(target, entry), {
    recursive: true,
    dereference: true,
  });
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
