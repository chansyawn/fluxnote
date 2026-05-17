import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "../..");

export const viteAliases = {
  "@renderer": path.resolve(repoRoot, "src/renderer"),
  "@cli": path.resolve(repoRoot, "src/cli"),
  "@main": path.resolve(repoRoot, "src/main"),
  "@preload": path.resolve(repoRoot, "src/preload"),
  "@shared": path.resolve(repoRoot, "src/shared"),
};
