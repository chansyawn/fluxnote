import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createShortcutIpcCommands } from "./ipc-commands";

export function createShortcutFeature(
  services: Parameters<typeof createShortcutIpcCommands>[0],
): BackendFeatureManifest {
  return {
    ipcCommands: createShortcutIpcCommands(services),
    name: "shortcut",
  };
}
