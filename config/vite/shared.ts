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

export const postHogDefines = {
  __FLUXNOTES_POSTHOG_HOST__: JSON.stringify(
    process.env.FLUXNOTES_POSTHOG_HOST ?? process.env.VITE_FLUXNOTES_POSTHOG_HOST ?? "",
  ),
  __FLUXNOTES_POSTHOG_KEY__: JSON.stringify(
    process.env.FLUXNOTES_POSTHOG_KEY ?? process.env.VITE_FLUXNOTES_POSTHOG_KEY ?? "",
  ),
};
