import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["workers/email/src/**/*.test.ts"],
  },
});
