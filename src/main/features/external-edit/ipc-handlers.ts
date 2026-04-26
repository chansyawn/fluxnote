import fs from "node:fs/promises";

import { businessError } from "@shared/ipc/errors";
import { eq } from "drizzle-orm";

import type { BackendStore } from "../backend-store";
import { getPublicBlockById, nowIsoString } from "../blocks/block-records";
import type { AppDatabase } from "../database/database-client";
import { blocks } from "../database/database-schema";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import type { ExternalEditManager } from "./external-edit-manager";

interface ExternalEditCommandServices {
  getDb: () => Promise<AppDatabase>;
  manager: ExternalEditManager;
  store: BackendStore;
}

async function deleteBlockAndAssets(
  db: AppDatabase,
  store: BackendStore,
  blockId: string,
): Promise<void> {
  db.delete(blocks).where(eq(blocks.id, blockId)).run();
  await fs.rm(store.getAssetPathForBlock(blockId), {
    force: true,
    recursive: true,
  });
}

export function createExternalEditCommandHandlers(
  services: ExternalEditCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "externalEditsList",
      handle() {
        return services.manager.listSessions();
      },
    }),
    defineIpcCommandHandler({
      key: "externalEditsSubmit",
      async handle(request) {
        const claimed = services.manager.claim(request.editId);
        try {
          const db = await services.getDb();
          const result = db
            .update(blocks)
            .set({
              content: request.content,
              updatedAt: nowIsoString(),
            })
            .where(eq(blocks.id, claimed.session.blockId))
            .run();
          if (result.changes === 0) {
            throw businessError(
              "BUSINESS.NOT_FOUND",
              `Resource not found: ${claimed.session.blockId}`,
            );
          }

          claimed.resolve({
            blockId: claimed.session.blockId,
            content: request.content,
            status: "submitted",
          });
          return getPublicBlockById(db, claimed.session.blockId);
        } catch (error) {
          claimed.resolve({
            blockId: claimed.session.blockId,
            status: "cancelled",
          });
          throw error;
        }
      },
    }),
    defineIpcCommandHandler({
      key: "externalEditsCancel",
      async handle(request) {
        const claimed = services.manager.claim(request.editId);
        try {
          await deleteBlockAndAssets(
            await services.getDb(),
            services.store,
            claimed.session.blockId,
          );
        } catch {
          // Block may have already been deleted elsewhere; ignore cleanup errors
        }
        claimed.resolve({
          blockId: claimed.session.blockId,
          status: "cancelled",
        });
        return undefined;
      },
    }),
  ] as const;
}
