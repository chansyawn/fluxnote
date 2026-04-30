import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import { openBlockApi } from "@shared/features/open-block";

import type { PendingOpenBlockRequest } from "./service";

interface OpenBlockServices {
  acknowledgePending: (blockId: string) => void;
  readPending: () => PendingOpenBlockRequest;
}

export function createOpenBlockFeature(services: OpenBlockServices) {
  return defineBackendFeature(openBlockApi, {
    commands: {
      acknowledgePending(request) {
        services.acknowledgePending(request.blockId);
        return undefined;
      },
      readPending() {
        return services.readPending();
      },
    },
  });
}
