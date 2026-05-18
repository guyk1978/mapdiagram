import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/architecture-entry.ts"),
      name: "ArchitectureEngine",
      formats: ["iife"],
      fileName: () => "architecture-engine.js",
    },
    outDir: "app",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: { extend: true },
    },
  },
});
