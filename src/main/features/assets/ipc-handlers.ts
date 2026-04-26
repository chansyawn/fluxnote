import fs from "node:fs/promises";
import path from "node:path";

import { businessError, internalError } from "@shared/ipc/errors";

import type { BackendStore } from "../backend-store";
import { assertBlockExists } from "../blocks/block-records";
import type { AppDatabase } from "../database/database-client";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import {
  assetUrlScheme,
  extFromMimeType,
  sanitizeFileName,
  splitAssetUrl,
} from "./asset-url-utils";

interface AssetsCommandServices {
  getDb: () => Promise<AppDatabase>;
  store: BackendStore;
}

export function createAssetsCommandHandlers(
  services: AssetsCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "assetsCreate",
      async handle(request) {
        const db = await services.getDb();
        const fileNameCandidate =
          request.fileName && request.fileName.trim().length > 0 ? request.fileName : null;
        assertBlockExists(db, request.blockId);

        const ext = extFromMimeType(request.mimeType);
        const baseName = fileNameCandidate ?? `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const fileName = sanitizeFileName(baseName);
        const blockDir = services.store.getAssetPathForBlock(request.blockId);
        const filePath = path.join(blockDir, fileName);

        await fs.mkdir(blockDir, { recursive: true });
        await fs.writeFile(filePath, Buffer.from(request.dataBase64, "base64"));

        return {
          assetUrl: `${assetUrlScheme}${request.blockId}/${fileName}`,
          altText: fileNameCandidate ?? fileName,
        };
      },
    }),
    defineIpcCommandHandler({
      key: "assetsCopy",
      async handle(request) {
        const db = await services.getDb();
        assertBlockExists(db, request.sourceBlockId);
        assertBlockExists(db, request.targetBlockId);

        const parsed = splitAssetUrl(request.assetUrl);
        if (parsed.blockId !== request.sourceBlockId) {
          throw businessError("BUSINESS.INVALID_OPERATION", "Asset source block mismatch", {
            assetBlockId: parsed.blockId,
            sourceBlockId: request.sourceBlockId,
          });
        }

        const sourcePath = path.join(
          services.store.getAssetPathForBlock(request.sourceBlockId),
          sanitizeFileName(parsed.fileName),
        );
        const targetFileName = sanitizeFileName(`${Date.now()}-${parsed.fileName}`);
        const targetPath = path.join(
          services.store.getAssetPathForBlock(request.targetBlockId),
          targetFileName,
        );

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        try {
          await fs.copyFile(sourcePath, targetPath);
        } catch (error) {
          throw internalError("Failed to copy asset", error);
        }

        return {
          assetUrl: `${assetUrlScheme}${request.targetBlockId}/${targetFileName}`,
        };
      },
    }),
  ] as const;
}
