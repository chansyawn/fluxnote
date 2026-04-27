import type { AppDatabase } from "@main/core/database/database-client";
import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import type { BackendStore } from "@main/core/persistence/backend-store";

import { createAssetService } from "./service";

interface AssetsCommandServices {
  getDb: () => Promise<AppDatabase>;
  store: BackendStore;
}

export function createAssetsIpcCommands(
  services: AssetsCommandServices,
): readonly AnyIpcCommandDefinition[] {
  const assetService = createAssetService({ store: services.store });

  return [
    defineIpcCommandDefinition({
      key: "assetsCreate",
      async handle(request) {
        return await assetService.createAsset(await services.getDb(), request);
      },
    }),
    defineIpcCommandDefinition({
      key: "assetsCopy",
      async handle(request) {
        return await assetService.copyAsset(await services.getDb(), request);
      },
    }),
  ] as const;
}
