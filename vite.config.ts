import { defineConfig } from "vite-plus";

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
  run: {
    cache: {
      tasks: true,
      scripts: false,
    },
  },
  staged: {
    "*": "vp check --fix",
    "{apps/desktop/lingui.config.ts,apps/desktop/src/renderer/**/*.{ts,tsx,po}}":
      "vp run i18n:check",
  },
});
