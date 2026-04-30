import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import { windowApi } from "@shared/features/window";

interface WindowServices {
  hideMainWindow: () => void;
  requestQuit: () => void;
  toggleMainWindow: () => void;
}

export function createWindowFeature(services: WindowServices) {
  return defineBackendFeature(windowApi, {
    commands: {
      destroy() {
        services.requestQuit();
        return undefined;
      },
      hide() {
        services.hideMainWindow();
        return undefined;
      },
      toggle() {
        services.toggleMainWindow();
        return undefined;
      },
    },
  });
}
