import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createCliIpcCommands } from "./ipc-commands";

export function createCliFeature(): BackendFeatureManifest {
  return {
    ipcCommands: createCliIpcCommands(),
    name: "cli",
  };
}
