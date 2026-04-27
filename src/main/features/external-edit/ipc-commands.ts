import type { AppDatabase } from "@main/core/database/database-client";
import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import type { BackendStore } from "@main/core/persistence/backend-store";

import type { ExternalEditManager } from "./manager";
import { createExternalEditService } from "./service";

interface ExternalEditCommandServices {
  getDb: () => Promise<AppDatabase>;
  manager: ExternalEditManager;
  store: BackendStore;
}

export function createExternalEditIpcCommands(
  services: ExternalEditCommandServices,
): readonly AnyIpcCommandDefinition[] {
  const externalEditService = createExternalEditService({
    manager: services.manager,
    store: services.store,
  });

  return [
    defineIpcCommandDefinition({
      key: "externalEditsList",
      handle() {
        return services.manager.listSessions();
      },
    }),
    defineIpcCommandDefinition({
      key: "externalEditsSubmit",
      async handle(request) {
        return await externalEditService.submitEdit(
          await services.getDb(),
          request.editId,
          request.content,
        );
      },
    }),
    defineIpcCommandDefinition({
      key: "externalEditsCancel",
      async handle(request) {
        await externalEditService.cancelEdit(await services.getDb(), request.editId);
        return undefined;
      },
    }),
  ] as const;
}
