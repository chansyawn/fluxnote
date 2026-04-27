import type { BackendFeatureManifest } from "@main/core/features/feature-manifest";

import { createAssetsFeature } from "../features/assets";
import { createBlocksFeature } from "../features/blocks";
import { createCliFeature } from "../features/cli";
import { createExternalEditFeature } from "../features/external-edit";
import { createOpenBlockFeature } from "../features/open-block";
import { createPreferencesFeature } from "../features/preferences";
import { createShortcutFeature } from "../features/shortcut";
import { createTagsFeature } from "../features/tags";
import { createWindowFeature } from "../features/window";
import { getAppDatabase, type RegisterIpcCommandsOptions } from "./ipc-command-services";

export function createBackendFeatureManifests(
  options: RegisterIpcCommandsOptions,
): readonly BackendFeatureManifest[] {
  const getDb = async () => await getAppDatabase(options);

  return [
    createCliFeature(),
    createBlocksFeature({
      getDb,
      store: options.store,
    }),
    createExternalEditFeature({
      getDb,
      manager: options.externalEditManager,
      store: options.store,
    }),
    createTagsFeature({
      getDb,
    }),
    createAssetsFeature({
      getDb,
      store: options.store,
    }),
    createOpenBlockFeature({
      acknowledgePending: options.acknowledgePendingOpenBlock,
      readPending: options.readPendingOpenBlock,
    }),
    createWindowFeature({
      hideMainWindow: options.hideMainWindow,
      requestQuit: options.requestQuit,
      toggleMainWindow: options.toggleMainWindow,
    }),
    createShortcutFeature({
      emitEvent: options.emitEvent,
    }),
    createPreferencesFeature({
      readPreferences: options.readPreferences,
      writePreferences: options.writePreferences,
    }),
  ];
}
