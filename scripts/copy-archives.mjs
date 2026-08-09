import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "_site");

async function copyTree(source, target) {
  await cp(source, target, { recursive: true, dereference: true });
}

async function createHtmlAlias(sourceRoot, aliasRoot, canonicalPrefix) {
  await rm(aliasRoot, { recursive: true, force: true });
  const queue = [""];

  while (queue.length > 0) {
    const relative = queue.pop();
    const sourceDirectory = path.join(sourceRoot, relative);
    const targetDirectory = path.join(aliasRoot, relative);
    await mkdir(targetDirectory, { recursive: true });

    for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
      const childRelative = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        queue.push(childRelative);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        const destination = `${canonicalPrefix}/${childRelative.split(path.sep).join("/")}`;
        const escaped = destination.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
        await writeFile(
          path.join(aliasRoot, childRelative),
          `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escaped}"><link rel="canonical" href="${escaped}"><title>Redirecting…</title><script>location.replace(${JSON.stringify(destination)}+location.search+location.hash)</script></head><body><p><a href="${escaped}">Continue to the current Gecode documentation</a>.</p></body></html>`,
        );
      }
    }
  }
}

const docsSource = path.join(root, "doc");
const docsTarget = path.join(output, "doc");
await rm(docsTarget, { recursive: true, force: true });
await mkdir(docsTarget, { recursive: true });
for (const entry of await readdir(docsSource, { withFileTypes: true })) {
  if (entry.name !== "latest") {
    await copyTree(path.join(docsSource, entry.name), path.join(docsTarget, entry.name));
  }
}
await copyTree(path.join(root, "users-archive"), path.join(output, "users-archive"));

// GitHub Pages artifacts cannot contain symlinks. Replace the two large aliases
// with tiny HTML redirect trees instead of duplicating the full current manual.
const latestSource = path.join(root, "doc", "6.4.0");
await createHtmlAlias(latestSource, path.join(docsTarget, "latest"), "/doc/6.4.0");
await createHtmlAlias(latestSource, path.join(output, "doc-latest"), "/doc/6.4.0");
