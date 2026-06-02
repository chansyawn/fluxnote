import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(configDir, "../..");
const repoRoot = path.resolve(appRoot, "../..");

export const viteAliases = {
  "@fluxnotes/utils": path.resolve(repoRoot, "packages/utils/src/index.ts"),
  "@renderer": path.resolve(appRoot, "src/renderer"),
  "@cli": path.resolve(appRoot, "src/cli"),
  "@main": path.resolve(appRoot, "src/main"),
  "@preload": path.resolve(appRoot, "src/preload"),
  "@shared": path.resolve(appRoot, "src/shared"),
};
