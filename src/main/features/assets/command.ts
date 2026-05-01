import type { AppDatabase } from "@main/core/database/database-client";
import type { IpcRouter } from "@main/core/ipc/create-ipc-router";
import type { PersistenceRuntime } from "@main/core/persistence";

import { copyAsset, createAsset } from "./service";

interface AssetsCommandDeps {
  persistence: PersistenceRuntime;
  db: AppDatabase;
}

export function registerAssetsCommands(ipc: IpcRouter, deps: AssetsCommandDeps): void {
  ipc.command("assets.copy", async (input) => {
    return await copyAsset({ paths: deps.persistence.paths }, deps.db, input);
  });

  ipc.command("assets.create", async (input) => {
    return await createAsset({ paths: deps.persistence.paths }, deps.db, input);
  });
}
