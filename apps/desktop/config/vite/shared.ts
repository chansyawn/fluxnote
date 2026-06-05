import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(configDir, "../..");

export const viteAliases = {
  "@fluxnotes/editor": path.resolve(appRoot, "../../packages/editor/src"),
  "@fluxnotes/ui": path.resolve(appRoot, "../../packages/ui/src"),
  "@renderer": path.resolve(appRoot, "src/renderer"),
  "@cli": path.resolve(appRoot, "src/cli"),
  "@main": path.resolve(appRoot, "src/main"),
  "@preload": path.resolve(appRoot, "src/preload"),
  "@shared": path.resolve(appRoot, "src/shared"),
};
