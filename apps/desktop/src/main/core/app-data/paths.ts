import path from "node:path";

import { APP_ASSETS_DIR_NAME, APP_DATABASE_FILE } from "@shared/app/app-config";

interface CreateAppDataPathsOptions {
  assetsDirName?: string;
  databaseFileName?: string;
  userDataPath: string;
}

export interface AppDataPaths {
  assetPathForBlock: (blockId: string) => string;
  assetsRootPath: string;
  databasePath: string;
}

export function createAppDataPaths(options: CreateAppDataPathsOptions): AppDataPaths {
  const assetsRootPath = path.join(
    options.userDataPath,
    options.assetsDirName ?? APP_ASSETS_DIR_NAME,
  );
  const databasePath = path.join(
    options.userDataPath,
    options.databaseFileName ?? APP_DATABASE_FILE,
  );

  return {
    assetPathForBlock: (blockId) => path.join(assetsRootPath, blockId),
    assetsRootPath,
    databasePath,
  };
}
