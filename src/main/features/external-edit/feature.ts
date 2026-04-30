import type { AppDatabase } from "@main/core/database/database-client";
import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import { externalEditApi } from "@shared/features/external-edit";

import type { ExternalEditManager } from "./manager";
import { createExternalEditService } from "./service";

interface ExternalEditServices {
  getDb: () => Promise<AppDatabase>;
  manager: ExternalEditManager;
}

export function createExternalEditFeature(services: ExternalEditServices) {
  const externalEditService = createExternalEditService({
    manager: services.manager,
  });

  return defineBackendFeature(externalEditApi, {
    commands: {
      async cancel(request) {
        await externalEditService.cancelEdit(request.editId);
        return undefined;
      },
      list() {
        return services.manager.listSessions();
      },
      async submit(request) {
        return await externalEditService.submitEdit(
          await services.getDb(),
          request.editId,
          request.content,
        );
      },
    },
  });
}
