import path from "node:path";
import { fileURLToPath } from "node:url";

import { lingui } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const host = process.env.TAURI_DEV_HOST;
const rootDir = path.dirname(fileURLToPath(import.meta.url));

// ignore these files for linting and formatting
const ignorePatterns = ["*.gen.ts", "src/locales/**"];

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      generatedRouteTree: "./src/route-tree.gen.ts",
    }),
    tailwindcss(),
    babel({
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    }),
    react(),
    lingui(),
  ],
  fmt: {
    sortImports: {},
    sortTailwindcss: {},
    ignorePatterns,
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns,
  },
  staged: { "*": "vp check --fix" },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
