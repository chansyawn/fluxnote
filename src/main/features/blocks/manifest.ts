import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createBlocksIpcCommands } from "./ipc-commands";

export function createBlocksFeature(
  services: Parameters<typeof createBlocksIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createBlocksIpcCommands(services),
    name: "blocks",
  };
}
