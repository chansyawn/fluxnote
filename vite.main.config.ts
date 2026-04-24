import { defineConfig } from "vite-plus";

import { viteAliases } from "./vite.config";

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["better-sqlite3", "bindings"],
    },
    lib: {
      entry: "src/main/index.ts",
      fileName: () => "main.cjs",
      formats: ["cjs"],
    },
  },
  resolve: {
    alias: viteAliases,
  },
});
