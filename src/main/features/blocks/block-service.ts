import type { Block } from "@shared/ipc/contracts";

import type { AppDatabase } from "../database/database-client";
import { blocks } from "../database/database-schema";
import { getNextBlockPosition, getPublicBlockById, nowIsoString } from "./block-records";

export function createBlockRecord(db: AppDatabase, content = ""): Block {
  const now = nowIsoString();
  const blockId = crypto.randomUUID();

  db.insert(blocks)
    .values({
      archivedAt: null,
      content,
      createdAt: now,
      id: blockId,
      position: getNextBlockPosition(db),
      updatedAt: now,
    })
    .run();

  return getPublicBlockById(db, blockId);
}
