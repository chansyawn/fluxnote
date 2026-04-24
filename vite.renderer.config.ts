import { lingui } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { viteAliases } from "./vite.config";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      generatedRouteTree: "./src/renderer/route-tree.gen.ts",
      routesDirectory: "./src/renderer/routes",
    }),
    tailwindcss(),
    babel({
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    }),
    react(),
    lingui(),
  ],
  resolve: {
    alias: viteAliases,
  },
});
