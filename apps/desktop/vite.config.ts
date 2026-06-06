import { defineConfig } from "vite-plus";

import { viteResolve } from "./config/vite/shared.ts";

export default defineConfig({
  resolve: viteResolve,
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
