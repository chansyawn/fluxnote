import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";

import type { ExternalEditManager } from "./manager";
import { cancelEdit, submitEdit } from "./service";

interface ExternalEditCommandDeps {
  manager: ExternalEditManager;
  db: AppDatabase;
  paths: AppDataPaths;
}

export function registerExternalEditCommands(ipc: IpcRouter, deps: ExternalEditCommandDeps): void {
  ipc.command("external-edit.cancel", async (input) => {
    await cancelEdit({ manager: deps.manager }, input.editId);
    return undefined;
  });

  ipc.command("external-edit.list", async () => {
    return deps.manager.listSessions();
  });

  ipc.command("external-edit.submit", async (input) => {
    return await submitEdit(
      { manager: deps.manager, paths: deps.paths },
      deps.db,
      input.editId,
      input.content,
    );
  });
}
