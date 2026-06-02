import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.join(rootDir, "apps/desktop");

const ignorePatterns = [
  ".agents/skills/**",
  "CHANGELOG.md",
  "*.gen.ts",
  "apps/desktop/src/renderer/locales/**",
  "apps/desktop/src/main/core/database/drizzle/**",
];

export default defineConfig({
  fmt: {
    sortImports: {},
    sortTailwindcss: {},
    ignorePatterns,
  },
  lint: {
    jsPlugins: ["./apps/desktop/config/oxlint/fluxnotes-plugin.ts"],
    options: { typeAware: true, typeCheck: true },
    ignorePatterns,
    rules: {
      "fluxnote/no-vitest-import": "error",
    },
  },
  resolve: {
    alias: {
      "@fluxnotes/utils": path.join(rootDir, "packages/utils/src/index.ts"),
      "@renderer": path.join(desktopDir, "src/renderer"),
      "@cli": path.join(desktopDir, "src/cli"),
      "@main": path.join(desktopDir, "src/main"),
      "@preload": path.join(desktopDir, "src/preload"),
      "@shared": path.join(desktopDir, "src/shared"),
    },
  },
  run: {
    cache: true,
  },
  staged: {
    "*": "vp check --fix",
    "{apps/desktop/lingui.config.ts,apps/desktop/src/renderer/**/*.{ts,tsx,po}}":
      "vp run i18n:check",
  },
  test: {
    setupFiles: ["./apps/desktop/src/test/setup.ts"],
  },
});
