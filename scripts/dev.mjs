import { access, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = process.cwd();
const forwardedArgs = process.argv.slice(2);
const refreshStatic = forwardedArgs.includes("--refresh-static");
const astroArgs = forwardedArgs.filter((argument) => argument !== "--refresh-static");
const replaceServer = hasOption(astroArgs, ["--force", "--ignore-lock"]);
const existingServer = replaceServer ? null : await activeDevServer();

if (existingServer && !refreshStatic) {
  reportExistingServer(existingServer);
  process.exit(0);
}

if (!refreshStatic && await staticAssetsReady()) {
  console.log("Reusing prepared static assets.");
} else {
  await prepareStaticAssets(refreshStatic);
}

if (existingServer) {
  reportExistingServer(existingServer);
  process.exit(0);
}

if (!hasOption(astroArgs, ["--host"])) {
  astroArgs.push("--host", "127.0.0.1");
}

const astroCli = fileURLToPath(new URL("../node_modules/astro/bin/astro.mjs", import.meta.url));
const child = spawn(process.execPath, [astroCli, "dev", ...astroArgs], {
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`Unable to start Astro: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

async function prepareStaticAssets(refresh) {
  const prepareArgs = refresh ? [] : ["--incremental"];
  await runNodeScript("prepare-static.mjs", prepareArgs);
  await runNodeScript("copy-users-archive.mjs", [
    ".astro-public",
    ...(refresh ? [] : ["--if-present"]),
  ]);
}

async function runNodeScript(script, args) {
  const scriptPath = fileURLToPath(new URL(script, import.meta.url));
  await new Promise((resolve, reject) => {
    const childProcess = spawn(process.execPath, [scriptPath, ...args], { stdio: "inherit" });
    childProcess.on("error", reject);
    childProcess.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with status ${code ?? "unknown"}.`));
    });
  });
}

async function activeDevServer() {
  try {
    const lock = JSON.parse(await readFile(path.join(root, ".astro", "dev.json"), "utf8"));
    if (typeof lock.pid !== "number" || typeof lock.url !== "string") return null;
    process.kill(lock.pid, 0);
    return lock;
  } catch {
    return null;
  }
}

async function staticAssetsReady() {
  const required = [
    ".astro-public/images/gecode-logo.ico",
    ".astro-public/CNAME",
    ".astro-public/robots.txt",
    ".astro-public/users-archive/index.html",
    ".astro-public/users-archive/archive.css",
    ".astro-public/users-archive/archive-index.json",
    ".astro-public/users-archive/threads/005041.html",
    ".astro-public/users-archive/pagefind/pagefind.js",
    ".astro-public/users-archive/pagefind/pagefind-entry.json",
  ];
  const present = (await Promise.all(required.map(async (file) => {
    try {
      await access(path.join(root, file));
      return true;
    } catch {
      return false;
    }
  }))).every(Boolean);
  if (!present) return false;

  return (await Promise.all([
    ["users-archive/index.html", ".astro-public/users-archive/index.html"],
    ["users-archive/archive.css", ".astro-public/users-archive/archive.css"],
    ["users-archive/archive.js", ".astro-public/users-archive/archive.js"],
    ["users-archive/archive-index.json", ".astro-public/users-archive/archive-index.json"],
    ["users-archive/threads/005041.html", ".astro-public/users-archive/threads/005041.html"],
    ["users-archive/2018-July/005044.html", ".astro-public/users-archive/2018-July/005044.html"],
  ].map(async ([source, target]) => {
    try {
      return (await stat(path.join(root, target))).mtimeMs >= (await stat(path.join(root, source))).mtimeMs;
    } catch {
      return false;
    }
  }))).every(Boolean);
}

function hasOption(args, names) {
  return args.some((argument) => names.some((name) =>
    argument === name || argument.startsWith(`${name}=`)));
}

function reportExistingServer(server) {
  console.log(`Dev server already running at ${server.url} (pid ${server.pid}).`);
  console.log("  Stop:   astro dev stop");
  console.log("  Status: astro dev status");
  console.log("  Logs:   astro dev logs");
}
