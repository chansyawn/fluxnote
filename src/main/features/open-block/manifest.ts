import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createOpenBlockIpcCommands } from "./ipc-commands";

export function createOpenBlockFeature(
  services: Parameters<typeof createOpenBlockIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createOpenBlockIpcCommands(services),
    name: "open-block",
  };
}
