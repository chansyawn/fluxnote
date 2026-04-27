import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createSampleIpcCommands } from "./ipc-commands";

export function createSampleFeature(): BackendFeatureManifest {
  return {
    ipcCommands: createSampleIpcCommands(),
    name: "sample",
  };
}
