import path from "node:path";
import { pathToFileURL } from "node:url";

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
  assets: Array<{
    dataBase64: string;
    fileName?: string;
    mimeType: string;
  }>;
}

export interface CopyAssetInput {
  assetUrls: string[];
  sourceBlockId: string;
  targetBlockId: string;
}

export interface ResolveAssetInput {
  assetUrls: string[];
}

function createUniqueAssetFileName(fileNameCandidate: string | null, mimeType: string): string {
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;
  if (fileNameCandidate) {
    return sanitizeFileName(`${uniquePrefix}-${fileNameCandidate}`);
  }

  return sanitizeFileName(`${uniquePrefix}.${extFromMimeType(mimeType)}`);
}

function getAssetFilePath(paths: PersistencePaths, assetUrl: string): string {
  const parsed = splitAssetUrl(assetUrl);
  return path.join(paths.getAssetPathForBlock(parsed.blockId), sanitizeFileName(parsed.fileName));
}

export async function createAsset(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: CreateAssetInput,
) {
  const storage = deps.storage ?? nodeAssetStorage;
  await assertBlockExists(db, input.blockId);

  const assets = [];
  for (const asset of input.assets) {
    const fileNameCandidate =
      asset.fileName && asset.fileName.trim().length > 0 ? asset.fileName : null;
    const fileName = createUniqueAssetFileName(fileNameCandidate, asset.mimeType);
    const blockDir = deps.paths.getAssetPathForBlock(input.blockId);
    const filePath = path.join(blockDir, fileName);

    await storage.writeFile(filePath, Buffer.from(asset.dataBase64, "base64"));
    assets.push({
      assetUrl: `${assetUrlScheme}${input.blockId}/${fileName}`,
      altText: fileNameCandidate ?? fileName,
    });
  }

  return {
    assets,
  };
}

export async function copyAsset(deps: AssetServiceOptions, db: AppDatabase, input: CopyAssetInput) {
  const storage = deps.storage ?? nodeAssetStorage;
  await assertBlockExists(db, input.sourceBlockId);
  await assertBlockExists(db, input.targetBlockId);

  const assets = [];
  for (const assetUrl of input.assetUrls) {
    const parsed = splitAssetUrl(assetUrl);
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
    const targetFileName = sanitizeFileName(
      `${Date.now()}-${crypto.randomUUID()}-${parsed.fileName}`,
    );
    const targetPath = path.join(
      deps.paths.getAssetPathForBlock(input.targetBlockId),
      targetFileName,
    );

    await storage.copyFile(sourcePath, targetPath);
    assets.push({
      sourceAssetUrl: assetUrl,
      assetUrl: `${assetUrlScheme}${input.targetBlockId}/${targetFileName}`,
    });
  }

  return {
    assets,
  };
}

export async function resolveAsset(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: ResolveAssetInput,
) {
  const assets = [];
  for (const assetUrl of input.assetUrls) {
    const parsed = splitAssetUrl(assetUrl);
    await assertBlockExists(db, parsed.blockId);
    assets.push({
      assetUrl,
      fileUrl: pathToFileURL(getAssetFilePath(deps.paths, assetUrl)).toString(),
    });
  }

  return { assets };
}
