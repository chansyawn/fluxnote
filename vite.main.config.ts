import { defineConfig } from "vite-plus";

import { viteAliases } from "./vite.config";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main/index.ts",
      fileName: () => "main.cjs",
      formats: ["cjs"],
    },
    rolldownOptions: {
      external: ["better-sqlite3"],
    },
  },
  resolve: {
    alias: viteAliases,
  },
});
