import { readFile } from "node:fs/promises";
import path from "node:path";

// Astro's dev route guard rejects HTML files that also exist at the project
// root. Serve this archive explicitly; all other requests keep Astro's guard.
export default function archiveDev() {
  const root = path.resolve("users-archive");
  return {
    name: "gecode-archive-dev",
    apply: "serve",
    enforce: "post",
    configureServer(server) {
      return () => {
        server.middlewares.stack.unshift({
          route: "",
          async handle(request, response, next) {
            if (!["GET", "HEAD"].includes(request.method)) return next();
            let url;
            let pathname;
            try {
              url = new URL(request.url, "http://localhost");
              pathname = decodeURIComponent(url.pathname);
            } catch {
              return next();
            }
            if (pathname === "/users-archive") {
              response.writeHead(308, { Location: `/users-archive/${url.search}` });
              return response.end();
            }
            if (!pathname.startsWith("/users-archive/")) return next();
            const relative = pathname.slice("/users-archive/".length);
            const file = path.resolve(root, relative.endsWith("/") || relative === "" ? `${relative}index.html` : relative);
            if (!file.startsWith(`${root}${path.sep}`) || !file.endsWith(".html")) return next();
            try {
              const html = await readFile(file);
              response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": html.length });
              response.end(request.method === "HEAD" ? undefined : html);
            } catch (error) {
              if (error.code === "ENOENT" || error.code === "ENOTDIR") return next();
              next(error);
            }
          },
        });
      };
    },
  };
}
