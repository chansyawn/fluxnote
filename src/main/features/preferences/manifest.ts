import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";
import type { PreferencesService } from "@main/features/preferences/service";

import { createPreferencesIpcCommands } from "./ipc-commands";

export function createPreferencesFeature(service: PreferencesService): BackendFeatureManifest {
  return {
    ipcCommands: createPreferencesIpcCommands(service),
    name: "preferences",
  };
}
