import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
