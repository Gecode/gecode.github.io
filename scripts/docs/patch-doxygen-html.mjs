#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function patchDoxygenHtml(root) {
  let changed = 0;
  let visited = 0;

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

      visited += 1;
      const source = await readFile(entryPath, "utf8");
      let html = source;
      if (!/<meta\s+name=["']viewport["']/i.test(html)) {
        const withViewport = html.replace(
          /(<meta\s+http-equiv="Content-Type"[^>]*>)/i,
          '$1\n<meta name="viewport" content="width=device-width, initial-scale=1">',
        );
        html = withViewport === html
          ? html.replace(
              /(<meta\s+charset=["'][^"']+["']\s*>)/i,
              '$1\n<meta name="viewport" content="width=device-width, initial-scale=1">',
            )
          : withViewport;
      }
      if (html.includes("codefold.init") && !/src=["']codefolding\.js["']/.test(html)) {
        html = html.replace(
          /(<link\s+href="stylesheet\.css"[^>]*>)/i,
          '$1\n<script type="text/javascript" src="codefolding.js"></script>',
        );
      }
      html = html.replaceAll("http://www.gecode.dev/index.html", "https://www.gecode.dev/");

      if (html !== source) {
        await writeFile(entryPath, html);
        changed += 1;
      }
    }
  }

  await visit(path.resolve(root));
  return { changed, visited };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  if (!root) {
    console.error("Usage: patch-doxygen-html.mjs <generated-html-directory>");
    process.exit(2);
  }
  const result = await patchDoxygenHtml(root);
  console.log(`Patched ${result.changed} of ${result.visited} generated HTML files.`);
}
