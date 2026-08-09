#!/usr/bin/env node
import { copyFile } from "node:fs/promises";
import path from "node:path";

const siteRoot = path.resolve(process.argv[2] ?? "_site");
await copyFile(path.join(siteRoot, "sitemap-index.xml"), path.join(siteRoot, "sitemap.xml"));
