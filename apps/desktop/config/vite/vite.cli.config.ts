import { defineConfig } from "vite-plus";

import { viteResolve } from "./shared.ts";

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
  resolve: viteResolve,
  ssr: {
    noExternal: true,
  },
});
