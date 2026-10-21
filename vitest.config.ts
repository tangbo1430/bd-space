import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Acceptance snapshots under artifacts are evidence, not runnable suites.
    include: ["tests/**/*.test.ts"],
  },
});
