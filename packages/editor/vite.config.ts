import path from "node:path";
import { fileURLToPath } from "node:url";

import { lingui } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    babel({
      plugins: ["@lingui/babel-plugin-lingui-macro"],
      presets: [reactCompilerPreset()],
    }),
    react(),
    lingui(),
  ],
  resolve: {
    alias: {
      "@fluxnotes/editor": path.resolve(packageRoot, "src/index.tsx"),
    },
  },
  pack: {
    dts: true,
    entry: ["src/index.tsx", "src/models.ts", "src/shortcuts.ts"],
    exports: false,
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
