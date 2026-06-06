import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  collectMarkdownImageAssetUrls,
  replaceMarkdownImageAssetUrls,
} from "@fluxnotes/editor/contracts";
import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import { businessError } from "@shared/ipc/result";

import { assertBlockExists } from "../blocks/service";
import { nodeAssetStorage, type AssetStorage } from "./storage";
import { assetUrlScheme, extFromMimeType, sanitizeFileName, splitAssetUrl } from "./url-utils";

interface AssetServiceOptions {
  paths: AppDataPaths;
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

export interface ImportFileAssetsInput {
  blockId: string;
  files: Array<{
    fileUrl: string;
  }>;
}

export interface ResolveAssetInput {
  assetUrls: string[];
}

function getSupportedImageMimeTypeFromPath(filePath: string): string | null {
  switch (path.extname(filePath).toLowerCase()) {
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return null;
  }
}

function createUniqueAssetFileName(fileNameCandidate: string | null, mimeType: string): string {
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;
  if (fileNameCandidate) {
    return sanitizeFileName(`${uniquePrefix}-${fileNameCandidate}`);
  }

  return sanitizeFileName(`${uniquePrefix}.${extFromMimeType(mimeType)}`);
}

function getAssetFilePath(paths: AppDataPaths, assetUrl: string): string {
  const parsed = splitAssetUrl(assetUrl);
  return path.join(paths.assetPathForBlock(parsed.blockId), sanitizeFileName(parsed.fileName));
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
    const blockDir = deps.paths.assetPathForBlock(input.blockId);
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

export async function importFileAssets(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: ImportFileAssetsInput,
) {
  const storage = deps.storage ?? nodeAssetStorage;
  await assertBlockExists(db, input.blockId);

  const assets = [];
  for (const file of input.files) {
    try {
      const sourcePath = fileURLToPath(file.fileUrl);
      const mimeType = getSupportedImageMimeTypeFromPath(sourcePath);
      if (!mimeType) {
        assets.push({
          error: "UNSUPPORTED_IMAGE_TYPE",
          fileUrl: file.fileUrl,
        });
        continue;
      }

      const fileName = createUniqueAssetFileName(path.basename(sourcePath), mimeType);
      const targetPath = path.join(deps.paths.assetPathForBlock(input.blockId), fileName);
      await storage.copyFile(sourcePath, targetPath);
      assets.push({
        altText: path.basename(sourcePath),
        assetUrl: `${assetUrlScheme}${input.blockId}/${fileName}`,
        fileUrl: file.fileUrl,
      });
    } catch {
      assets.push({
        error: "IMPORT_FAILED",
        fileUrl: file.fileUrl,
      });
    }
  }

  return { assets };
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
      deps.paths.assetPathForBlock(input.sourceBlockId),
      sanitizeFileName(parsed.fileName),
    );
    const targetFileName = sanitizeFileName(
      `${Date.now()}-${crypto.randomUUID()}-${parsed.fileName}`,
    );
    const targetPath = path.join(deps.paths.assetPathForBlock(input.targetBlockId), targetFileName);

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

export async function externalizeMarkdownAssetUrls(
  deps: AssetServiceOptions,
  db: AppDatabase,
  content: string,
): Promise<string> {
  const assetUrls = collectMarkdownImageAssetUrls(content);
  if (assetUrls.length === 0) {
    return content;
  }

  const resolvedAssets = await resolveAsset(deps, db, { assetUrls });
  const assetUrlMap = new Map(
    resolvedAssets.assets.map((asset) => [asset.assetUrl, asset.fileUrl]),
  );
  return replaceMarkdownImageAssetUrls(content, assetUrlMap);
}
