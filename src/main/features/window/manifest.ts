import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createWindowIpcCommands } from "./ipc-commands";

export function createWindowFeature(
  services: Parameters<typeof createWindowIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createWindowIpcCommands(services),
    name: "window",
  };
}
