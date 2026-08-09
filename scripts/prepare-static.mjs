import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, ".astro-public");
const entries = ["images", "papers", "download", "CNAME", "robots.txt"];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const entry of entries) {
  await cp(path.join(root, entry), path.join(target, entry), {
    recursive: true,
    dereference: true,
  });
}
