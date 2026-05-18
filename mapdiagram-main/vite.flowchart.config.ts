import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/flowchart/index.ts"),
      name: "FlowchartCompiler",
      formats: ["iife"],
      fileName: () => "flowchart-compiler.js",
    },
    outDir: "app",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: { extend: true },
    },
  },
});
