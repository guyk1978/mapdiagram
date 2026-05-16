import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/runtime/index.js"),
      name: "MapDiagramRuntime",
      formats: ["iife"],
      fileName: () => "mapdiagram-runtime.js",
    },
    outDir: "app/runtime",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: { extend: true },
    },
  },
});
