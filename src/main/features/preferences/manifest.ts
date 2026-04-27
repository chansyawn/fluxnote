import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createPreferencesIpcCommands } from "./ipc-commands";

export function createPreferencesFeature(
  services: Parameters<typeof createPreferencesIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createPreferencesIpcCommands(services),
    name: "preferences",
  };
}
