import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createTagsIpcCommands } from "./ipc-commands";

export function createTagsFeature(
  services: Parameters<typeof createTagsIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createTagsIpcCommands(services),
    name: "tags",
  };
}
