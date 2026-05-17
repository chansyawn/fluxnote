import { defineConfig } from "vite-plus";

import { viteAliases } from "./config/vite/shared.ts";

// ignore these files for linting and formatting
const ignorePatterns = ["*.gen.ts", "src/renderer/locales/**", "src/main/core/database/drizzle/**"];

export default defineConfig({
  fmt: {
    sortImports: {},
    sortTailwindcss: {},
    ignorePatterns,
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns,
  },
  resolve: {
    alias: viteAliases,
  },
  staged: {
    "*": "vp check --fix",
    "{lingui.config.ts,src/renderer/**/*.{ts,tsx,po}}": "vp run i18n:check",
  },
});
