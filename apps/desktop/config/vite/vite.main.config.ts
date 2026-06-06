import { defineConfig } from "vite-plus";

import { viteResolve } from "./shared.ts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main/index.ts",
      fileName: () => "main.cjs",
      formats: ["cjs"],
    },
  },
  resolve: viteResolve,
});
