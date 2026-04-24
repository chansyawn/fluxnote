import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export const viteAliases = {
  "@renderer": path.resolve(rootDir, "src/renderer"),
  "@cli": path.resolve(rootDir, "src/cli"),
  "@main": path.resolve(rootDir, "src/main"),
  "@preload": path.resolve(rootDir, "src/preload"),
  "@shared": path.resolve(rootDir, "src/shared"),
};

// ignore these files for linting and formatting
const ignorePatterns = ["*.gen.ts", "src/renderer/locales/**"];

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
  staged: { "*": "vp check --fix" },
});
