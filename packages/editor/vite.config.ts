import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@fluxnotes/ui": path.resolve(packageRoot, "../ui/src"),
    },
  },
  pack: {
    dts: true,
    entry: ["src/index.tsx", "src/models.ts", "src/shortcuts.ts"],
    exports: true,
    format: ["esm"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  staged: {
    "{lingui.config.ts,src/**/*.{ts,tsx,po}}": "vp run i18n:check",
  },
  test: {
    setupFiles: ["./src/test-helper/setup.ts"],
  },
});
