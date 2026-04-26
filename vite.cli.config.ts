import { defineConfig } from "vite-plus";

import { viteAliases } from "./vite.config";

export default defineConfig({
  build: {
    lib: false,
    outDir: ".vite/cli",
    rolldownOptions: {
      output: {
        entryFileNames: "flux-cli.mjs",
      },
    },
    ssr: "src/cli/index.ts",
    target: "node20",
  },
  resolve: {
    alias: viteAliases,
  },
  ssr: {
    noExternal: true,
  },
});
