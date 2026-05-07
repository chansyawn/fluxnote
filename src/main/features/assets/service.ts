import path from "node:path";

import type { AppDatabase } from "@main/core/database";
import type { PersistencePaths } from "@main/core/persistence";
import { businessError } from "@shared/ipc/result";

import { assertBlockExists } from "../blocks/service";
import { nodeAssetStorage, type AssetStorage } from "./storage";
import { assetUrlScheme, extFromMimeType, sanitizeFileName, splitAssetUrl } from "./url-utils";

interface AssetServiceOptions {
  paths: PersistencePaths;
  storage?: AssetStorage;
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

function createUniqueAssetFileName(fileNameCandidate: string | null, mimeType: string): string {
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;
  if (fileNameCandidate) {
    return sanitizeFileName(`${uniquePrefix}-${fileNameCandidate}`);
  }

  return sanitizeFileName(`${uniquePrefix}.${extFromMimeType(mimeType)}`);
}

export async function createAsset(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: CreateAssetInput,
) {
  const storage = deps.storage ?? nodeAssetStorage;
  const fileNameCandidate =
    input.fileName && input.fileName.trim().length > 0 ? input.fileName : null;
  await assertBlockExists(db, input.blockId);

  const fileName = createUniqueAssetFileName(fileNameCandidate, input.mimeType);
  const blockDir = deps.paths.getAssetPathForBlock(input.blockId);
  const filePath = path.join(blockDir, fileName);

  await storage.writeFile(filePath, Buffer.from(input.dataBase64, "base64"));

  return {
    assetUrl: `${assetUrlScheme}${input.blockId}/${fileName}`,
    altText: fileNameCandidate ?? fileName,
  };
}

export async function copyAsset(deps: AssetServiceOptions, db: AppDatabase, input: CopyAssetInput) {
  const storage = deps.storage ?? nodeAssetStorage;
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
    deps.paths.getAssetPathForBlock(input.sourceBlockId),
    sanitizeFileName(parsed.fileName),
  );
  const targetFileName = sanitizeFileName(`${Date.now()}-${parsed.fileName}`);
  const targetPath = path.join(
    deps.paths.getAssetPathForBlock(input.targetBlockId),
    targetFileName,
  );

  await storage.copyFile(sourcePath, targetPath);

  return {
    assetUrl: `${assetUrlScheme}${input.targetBlockId}/${targetFileName}`,
  };
}
