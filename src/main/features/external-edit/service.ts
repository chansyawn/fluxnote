import fs from "node:fs/promises";

import type { AppDatabase } from "@main/core/database/database-client";
import { blocks } from "@main/core/database/database-schema";
import { nowIsoString } from "@main/core/database/db-utils";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { businessError } from "@shared/ipc/errors";
import { eq } from "drizzle-orm";

import { getPublicBlockById } from "../blocks/service";
import type { ExternalEditManager } from "./manager";

interface ExternalEditServiceOptions {
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

export function createExternalEditService(options: ExternalEditServiceOptions) {
  async function submitEdit(db: AppDatabase, editId: string, content: string) {
    const claimed = options.manager.claim(editId);
    try {
      const result = db
        .update(blocks)
        .set({
          content,
          updatedAt: nowIsoString(),
        })
        .where(eq(blocks.id, claimed.session.blockId))
        .run();
      if (result.changes === 0) {
        throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${claimed.session.blockId}`);
      }

      claimed.resolve({
        blockId: claimed.session.blockId,
        content,
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
  }

  async function cancelEdit(db: AppDatabase, editId: string): Promise<void> {
    const claimed = options.manager.claim(editId);
    try {
      await deleteBlockAndAssets(db, options.store, claimed.session.blockId);
    } catch {
      // Block may have already been deleted elsewhere; ignore cleanup errors.
    }
    claimed.resolve({
      blockId: claimed.session.blockId,
      status: "cancelled",
    });
  }

  return { cancelEdit, submitEdit };
}
