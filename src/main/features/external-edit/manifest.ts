import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createExternalEditIpcCommands } from "./ipc-commands";

export function createExternalEditFeature(
  services: Parameters<typeof createExternalEditIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createExternalEditIpcCommands(services),
    name: "external-edit",
  };
}
