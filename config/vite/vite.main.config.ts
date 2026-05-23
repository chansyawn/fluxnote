import { defineConfig } from "vite-plus";

import { postHogDefines, viteAliases } from "./shared.ts";

export default defineConfig({
  define: postHogDefines,
  build: {
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
