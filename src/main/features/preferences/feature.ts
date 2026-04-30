import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import { preferencesApi } from "@shared/features/preferences";

import type { PreferencesService } from "./service";

export function createPreferencesFeature(service: PreferencesService) {
  return defineBackendFeature(preferencesApi, {
    commands: {
      patch(request) {
        return service.patchSettings(request);
      },
      read() {
        return service.readSettings();
      },
      reset() {
        return service.resetSettings();
      },
    },
  });
}
