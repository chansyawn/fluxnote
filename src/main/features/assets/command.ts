import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";

import { copyAsset, createAsset, importFileAssets, resolveAsset } from "./service";

interface AssetsCommandDeps {
  paths: AppDataPaths;
  db: AppDatabase;
}

export function registerAssetsCommands(ipc: IpcRouter, deps: AssetsCommandDeps): void {
  ipc.command("assets.copy", async (input) => {
    return await copyAsset({ paths: deps.paths }, deps.db, input);
  });

  ipc.command("assets.create", async (input) => {
    return await createAsset({ paths: deps.paths }, deps.db, input);
  });

  ipc.command("assets.importFiles", async (input) => {
    return await importFileAssets({ paths: deps.paths }, deps.db, input);
  });

  ipc.command("assets.resolve", async (input) => {
    return await resolveAsset({ paths: deps.paths }, deps.db, input);
  });
}
