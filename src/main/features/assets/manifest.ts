import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createAssetsIpcCommands } from "./ipc-commands";

export function createAssetsFeature(
  services: Parameters<typeof createAssetsIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createAssetsIpcCommands(services),
    name: "assets",
  };
}
