import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    environmentMatchGlobs: [["tests/runtime/overlay-runtime.test.ts", "happy-dom"]],
  },
});
