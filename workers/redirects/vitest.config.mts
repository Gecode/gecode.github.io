import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./workers/redirects/wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["workers/redirects/src/**/*.test.ts"],
  },
});
