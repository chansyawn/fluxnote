import { defineConfig } from "vite-plus";

const ignorePatterns = [
  ".agents/skills/**",
  "CHANGELOG.md",
  "*.gen.ts",
  "apps/desktop/src/renderer/locales/**",
  "apps/desktop/src/main/core/database/drizzle/**",
  "packages/editor/src/locales/**",
];

const i18nCheckStagedFiles = [
  "config/i18n/lingui.ts",
  "scripts/i18n/**/*.ts",
  "apps/desktop/lingui.config.ts",
  "apps/desktop/src/renderer/**/*.{ts,tsx,po}",
  "packages/editor/lingui.config.ts",
  "packages/editor/src/**/*.{ts,tsx,po}",
];

const i18nCheckStagedPattern = `{${i18nCheckStagedFiles.join(",")}}`;

export default defineConfig({
  fmt: {
    sortImports: {},
    sortTailwindcss: {},
    ignorePatterns,
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    options: { typeAware: true, typeCheck: true },
    ignorePatterns,
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  run: {
    cache: {
      tasks: true,
      scripts: false,
    },
  },
  staged: {
    "*": "vp check --fix",
    [i18nCheckStagedPattern]: "vp run i18n:check",
  },
});
