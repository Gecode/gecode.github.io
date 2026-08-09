import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.gecode.dev",
  publicDir: ".astro-public",
  output: "static",
  outDir: "./_site",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
