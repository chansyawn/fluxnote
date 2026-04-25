import { defineConfig } from "vite-plus";

import { viteAliases } from "./vite.config";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: ".vite/build",
    rolldownOptions: {
      output: {
        banner: "#!/usr/bin/env node",
        entryFileNames: "flux-cli.mjs",
      },
    },
    ssr: "src/cli/flux-cli.ts",
    target: "node20",
  },
  resolve: {
    alias: viteAliases,
  },
});
