import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { macNativeDevtoolsPlugin } from "./src/devtools/server/mac-native-devtools-plugin.ts";

export default defineConfig({
  plugins: [tailwindcss(), react(), macNativeDevtoolsPlugin()],
});
