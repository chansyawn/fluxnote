import { defineConfig } from "vite-plus";

import { viteAliases } from "./vite.config";

export default defineConfig({
  build: {
    lib: {
      entry: "src/preload/index.ts",
      fileName: () => "preload.cjs",
      formats: ["cjs"],
    },
    rolldownOptions: {
      external: ["electron"],
      output: {
        assetFileNames: "preload.[ext]",
        chunkFileNames: "preload.cjs",
        entryFileNames: "preload.cjs",
      },
    },
  },
  resolve: {
    alias: viteAliases,
  },
});
