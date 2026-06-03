import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(configDir, "../..");
const workspaceRoot = path.resolve(appRoot, "../..");

export const viteAliases = {
  "@fluxnotes/ui/styles": path.resolve(workspaceRoot, "packages/ui/src/styles/index.css"),
  "@fluxnotes/ui": path.resolve(workspaceRoot, "packages/ui/src"),
  "@renderer": path.resolve(appRoot, "src/renderer"),
  "@cli": path.resolve(appRoot, "src/cli"),
  "@main": path.resolve(appRoot, "src/main"),
  "@preload": path.resolve(appRoot, "src/preload"),
  "@shared": path.resolve(appRoot, "src/shared"),
};
