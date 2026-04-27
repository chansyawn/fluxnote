import fs from "node:fs/promises";
import path from "node:path";

import { internalError } from "@shared/ipc/errors";

export interface AssetStorage {
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;
  writeFile: (filePath: string, data: Buffer) => Promise<void>;
}

export const nodeAssetStorage: AssetStorage = {
  async copyFile(sourcePath, targetPath) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    try {
      await fs.copyFile(sourcePath, targetPath);
    } catch (error) {
      throw internalError("Failed to copy asset", error);
    }
  },
  async writeFile(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  },
};
