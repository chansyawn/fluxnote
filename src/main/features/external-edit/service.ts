import type { AppDatabase } from "@main/core/database/database-client";
import { blocks } from "@main/core/database/database-schema";
import { getSqliteChangedRows, nowIsoString } from "@main/core/database/db-utils";
import { businessError } from "@shared/ipc/errors";
import { eq } from "drizzle-orm";

import { getPublicBlockById } from "../blocks/service";
import type { ExternalEditManager } from "./manager";

interface ExternalEditServiceOptions {
  manager: ExternalEditManager;
}

export function createExternalEditService(options: ExternalEditServiceOptions) {
  async function submitEdit(db: AppDatabase, editId: string, content: string) {
    const claimed = options.manager.claim(editId);
    try {
      const result = await db
        .update(blocks)
        .set({
          content,
          updatedAt: nowIsoString(),
        })
        .where(eq(blocks.id, claimed.session.blockId))
        .run();
      if (getSqliteChangedRows(result) === 0) {
        throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${claimed.session.blockId}`);
      }

      claimed.resolve({
        blockId: claimed.session.blockId,
        content,
        status: "submitted",
      });
      return await getPublicBlockById(db, claimed.session.blockId);
    } catch (error) {
      claimed.resolve({
        blockId: claimed.session.blockId,
        status: "cancelled",
      });
      throw error;
    }
  }

  async function cancelEdit(editId: string): Promise<void> {
    const claimed = options.manager.claim(editId);
    claimed.resolve({
      blockId: claimed.session.blockId,
      status: "cancelled",
    });
  }

  return { cancelEdit, submitEdit };
}
