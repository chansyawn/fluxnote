import path from "node:path";

interface CreatePersistencePathsOptions {
  assetsDirName: string;
  databaseFileName: string;
  getUserDataPath: () => string;
}

export interface PersistencePaths {
  getAssetPathForBlock: (blockId: string) => string;
  getAssetsRootPath: () => string;
  getDatabasePath: () => string;
}

export function createPersistencePaths(options: CreatePersistencePathsOptions): PersistencePaths {
  function getDatabasePath(): string {
    return path.join(options.getUserDataPath(), options.databaseFileName);
  }

  function getAssetsRootPath(): string {
    return path.join(options.getUserDataPath(), options.assetsDirName);
  }

  function getAssetPathForBlock(blockId: string): string {
    return path.join(getAssetsRootPath(), blockId);
  }

  return {
    getAssetPathForBlock,
    getAssetsRootPath,
    getDatabasePath,
  };
}
