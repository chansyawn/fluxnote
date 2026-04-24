import fs from "node:fs/promises";

import { businessError } from "@shared/ipc/errors";

import type { BackendStore, SqliteDatabase } from "../backend-store";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import {
  getPublicBlockById,
  getTagsForBlocks,
  mapBlockRow,
  nowIsoString,
  placeholders,
  type BlockRow,
} from "./block-records";

interface BlocksCommandServices {
  getDb: () => Promise<SqliteDatabase>;
  store: BackendStore;
}

async function listBlocks(
  db: SqliteDatabase,
  tagIds: string[] | undefined,
  visibility: "active" | "archived",
) {
  const archivedPredicate =
    visibility === "archived" ? "b.archived_at IS NOT NULL" : "b.archived_at IS NULL";

  let blockRows: BlockRow[];
  if (tagIds && tagIds.length > 0) {
    const tagPlaceholders = placeholders(tagIds.length);
    blockRows = db
      .prepare<BlockRow>(
        `
          SELECT
            b.id,
            b.position,
            b.content,
            b.archived_at,
            b.created_at,
            b.updated_at
          FROM blocks b
          INNER JOIN block_tags bt ON bt.block_id = b.id
          WHERE ${archivedPredicate} AND bt.tag_id IN (${tagPlaceholders})
          GROUP BY b.id
          HAVING COUNT(DISTINCT bt.tag_id) = ?
          ORDER BY b.position DESC
        `,
      )
      .all(...tagIds, tagIds.length);
  } else {
    blockRows = db
      .prepare<BlockRow>(
        `
          SELECT
            b.id,
            b.position,
            b.content,
            b.archived_at,
            b.created_at,
            b.updated_at
          FROM blocks b
          WHERE ${archivedPredicate}
          ORDER BY b.position DESC
        `,
      )
      .all();
  }

  const blockIds = blockRows.map((block) => block.id);
  const tagsByBlockId = getTagsForBlocks(db, blockIds);
  return blockRows.map((block) => mapBlockRow(block, tagsByBlockId.get(block.id) ?? []));
}

export function createBlocksCommandHandlers(
  services: BlocksCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "blocksList",
      async handle(request) {
        return await listBlocks(await services.getDb(), request.tagIds, request.visibility);
      },
    }),
    defineIpcCommandHandler({
      key: "blocksCreate",
      async handle() {
        const db = await services.getDb();
        const now = nowIsoString();
        const blockId = crypto.randomUUID();
        const maxPositionRow = db
          .prepare<{ max_position: number }>(
            "SELECT COALESCE(MAX(position), 0) AS max_position FROM blocks",
          )
          .get();
        const nextPosition = (maxPositionRow?.max_position ?? 0) + 1;

        db.prepare(
          `
            INSERT INTO blocks (
              id,
              position,
              content,
              archived_at,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
        ).run(blockId, nextPosition, "", null, now, now);

        return getPublicBlockById(db, blockId);
      },
    }),
    defineIpcCommandHandler({
      key: "blocksUpdateContent",
      async handle(request) {
        const db = await services.getDb();
        const result = db
          .prepare("UPDATE blocks SET content = ?, updated_at = ? WHERE id = ?")
          .run(request.content, nowIsoString(), request.blockId);
        if (result.changes === 0) {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.blockId}`);
        }

        return getPublicBlockById(db, request.blockId);
      },
    }),
    defineIpcCommandHandler({
      key: "blocksDelete",
      async handle(request) {
        const db = await services.getDb();
        const result = db.prepare("DELETE FROM blocks WHERE id = ?").run(request.blockId);
        if (result.changes === 0) {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.blockId}`);
        }

        await fs.rm(services.store.getAssetPathForBlock(request.blockId), {
          force: true,
          recursive: true,
        });
        return { deletedBlockId: request.blockId };
      },
    }),
    defineIpcCommandHandler({
      key: "blocksArchive",
      async handle(request) {
        const db = await services.getDb();
        const now = nowIsoString();
        const result = db
          .prepare("UPDATE blocks SET archived_at = ?, updated_at = ? WHERE id = ?")
          .run(now, now, request.blockId);
        if (result.changes === 0) {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.blockId}`);
        }

        return getPublicBlockById(db, request.blockId);
      },
    }),
    defineIpcCommandHandler({
      key: "blocksRestore",
      async handle(request) {
        const db = await services.getDb();
        const result = db
          .prepare("UPDATE blocks SET archived_at = NULL, updated_at = ? WHERE id = ?")
          .run(nowIsoString(), request.blockId);
        if (result.changes === 0) {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.blockId}`);
        }

        return getPublicBlockById(db, request.blockId);
      },
    }),
  ] as const;
}
