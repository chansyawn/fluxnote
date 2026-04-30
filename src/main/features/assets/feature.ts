import type { AppDatabase } from "@main/core/database/database-client";
import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { assetsApi } from "@shared/features/assets";

import { createAssetService } from "./service";

interface AssetsServices {
  getDb: () => Promise<AppDatabase>;
  store: BackendStore;
}

export function createAssetsFeature(services: AssetsServices) {
  const assetService = createAssetService({ store: services.store });

  return defineBackendFeature(assetsApi, {
    commands: {
      async copy(request) {
        return await assetService.copyAsset(await services.getDb(), request);
      },
      async create(request) {
        return await assetService.createAsset(await services.getDb(), request);
      },
    },
  });
}
