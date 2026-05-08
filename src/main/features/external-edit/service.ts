import type { AppDatabase } from "@main/core/database";
import { blocks } from "@main/core/database";
import { getSqliteChangedRows, nowIsoString } from "@main/core/database";
import type { PersistencePaths } from "@main/core/persistence";
import { businessError } from "@shared/ipc/result";
import { eq } from "drizzle-orm";

import { externalizeMarkdownAssetUrls } from "../assets/service";
import { getPublicBlockById } from "../blocks/service";
import type { ExternalEditManager } from "./manager";

interface ExternalEditServiceOptions {
  manager: ExternalEditManager;
}

interface SubmitEditServiceOptions extends ExternalEditServiceOptions {
  paths: PersistencePaths;
}

export async function submitEdit(
  deps: SubmitEditServiceOptions,
  db: AppDatabase,
  editId: string,
  content: string,
) {
  const claimed = deps.manager.claim(editId);
  try {
    const externalContent = await externalizeMarkdownAssetUrls({ paths: deps.paths }, db, content);
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
      content: externalContent,
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

export async function cancelEdit(deps: ExternalEditServiceOptions, editId: string): Promise<void> {
  const claimed = deps.manager.claim(editId);
  claimed.resolve({
    blockId: claimed.session.blockId,
    status: "cancelled",
  });
}
