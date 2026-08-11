import { cp, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "users-archive");
const target = path.join(root, "_site", "users-archive");

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true, dereference: true });
