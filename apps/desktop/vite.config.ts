import { defineConfig } from "vite-plus";

import { viteAliases } from "./config/vite/shared.ts";

export default defineConfig({
  resolve: {
    alias: viteAliases,
  },
  staged: {
    "{lingui.config.ts,src/renderer/**/*.{ts,tsx,po}}": "vp run i18n:check",
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
