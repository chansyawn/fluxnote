import { defineConfig } from "vite-plus";

import { viteAliases } from "./config/vite/shared.ts";

export default defineConfig({
  resolve: {
    alias: viteAliases,
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
