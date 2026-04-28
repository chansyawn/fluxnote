import path from "node:path";

import type { AppDatabase } from "@main/core/database/database-client";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { businessError } from "@shared/ipc/errors";

import { assertBlockExists } from "../blocks/service";
import {
  assetUrlScheme,
  extFromMimeType,
  sanitizeFileName,
  splitAssetUrl,
} from "./asset-url-utils";
import { nodeAssetStorage, type AssetStorage } from "./storage";

interface AssetServiceOptions {
  storage?: AssetStorage;
  store: BackendStore;
}

export interface CreateAssetInput {
  blockId: string;
  dataBase64: string;
  fileName?: string;
  mimeType: string;
}

export interface CopyAssetInput {
  assetUrl: string;
  sourceBlockId: string;
  targetBlockId: string;
}

export function createAssetService(options: AssetServiceOptions) {
  const storage = options.storage ?? nodeAssetStorage;

  async function createAsset(db: AppDatabase, input: CreateAssetInput) {
    const fileNameCandidate =
      input.fileName && input.fileName.trim().length > 0 ? input.fileName : null;
    await assertBlockExists(db, input.blockId);

    const ext = extFromMimeType(input.mimeType);
    const baseName = fileNameCandidate ?? `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const fileName = sanitizeFileName(baseName);
    const blockDir = options.store.getAssetPathForBlock(input.blockId);
    const filePath = path.join(blockDir, fileName);

    await storage.writeFile(filePath, Buffer.from(input.dataBase64, "base64"));

    return {
      assetUrl: `${assetUrlScheme}${input.blockId}/${fileName}`,
      altText: fileNameCandidate ?? fileName,
    };
  }

  async function copyAsset(db: AppDatabase, input: CopyAssetInput) {
    await assertBlockExists(db, input.sourceBlockId);
    await assertBlockExists(db, input.targetBlockId);

    const parsed = splitAssetUrl(input.assetUrl);
    if (parsed.blockId !== input.sourceBlockId) {
      throw businessError("BUSINESS.INVALID_OPERATION", "Asset source block mismatch", {
        assetBlockId: parsed.blockId,
        sourceBlockId: input.sourceBlockId,
      });
    }

    const sourcePath = path.join(
      options.store.getAssetPathForBlock(input.sourceBlockId),
      sanitizeFileName(parsed.fileName),
    );
    const targetFileName = sanitizeFileName(`${Date.now()}-${parsed.fileName}`);
    const targetPath = path.join(
      options.store.getAssetPathForBlock(input.targetBlockId),
      targetFileName,
    );

    await storage.copyFile(sourcePath, targetPath);

    return {
      assetUrl: `${assetUrlScheme}${input.targetBlockId}/${targetFileName}`,
    };
  }

  return { copyAsset, createAsset };
}
