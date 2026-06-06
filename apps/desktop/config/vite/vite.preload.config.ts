import { defineConfig } from "vite-plus";

import { viteResolve } from "./shared.ts";

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
  resolve: viteResolve,
});
