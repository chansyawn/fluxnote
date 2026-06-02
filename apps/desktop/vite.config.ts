import { defineConfig } from "vite-plus";

import { viteAliases } from "./config/vite/shared.ts";

// ignore these files for linting and formatting
const ignorePatterns = [
  ".agents/skills/**",
  "CHANGELOG.md",
  "*.gen.ts",
  "src/renderer/locales/**",
  "src/main/core/database/drizzle/**",
];

export default defineConfig({
  fmt: {
    sortImports: {},
    sortTailwindcss: {},
    ignorePatterns,
  },
  lint: {
    jsPlugins: ["./config/oxlint/fluxnotes-plugin.ts"],
    options: { typeAware: true, typeCheck: true },
    ignorePatterns,
    rules: {
      "fluxnote/no-vitest-import": "error",
    },
  },
  resolve: {
    alias: viteAliases,
  },
  staged: {
    "*": "vp check --fix",
    "{lingui.config.ts,src/renderer/**/*.{ts,tsx,po}}": "vp run i18n:check",
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
