import fs from "node:fs/promises";

import { businessError } from "@shared/ipc/errors";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import type { BackendStore } from "../backend-store";
import type { AppDatabase } from "../database/database-client";
import { blockTags, blocks, type BlockRecord } from "../database/database-schema";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import { getPublicBlockById, getTagsForBlocks, mapBlockRow, nowIsoString } from "./block-records";
import { createBlockRecord } from "./block-service";

interface BlocksCommandServices {
  getDb: () => Promise<AppDatabase>;
  store: BackendStore;
}

async function listBlocks(
  db: AppDatabase,
  tagIds: string[] | undefined,
  visibility: "active" | "archived",
) {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const selectedFields = {
    archivedAt: blocks.archivedAt,
    content: blocks.content,
    createdAt: blocks.createdAt,
    id: blocks.id,
    position: blocks.position,
    updatedAt: blocks.updatedAt,
  } satisfies Record<string, unknown>;

  let blockRows: BlockRecord[];
  const uniqueTagIds = tagIds ? Array.from(new Set(tagIds)) : [];
  if (uniqueTagIds.length > 0) {
    blockRows = db
      .select(selectedFields)
      .from(blocks)
      .innerJoin(blockTags, eq(blockTags.blockId, blocks.id))
      .where(and(archivedPredicate, inArray(blockTags.tagId, uniqueTagIds)))
      .groupBy(
        blocks.id,
        blocks.position,
        blocks.content,
        blocks.archivedAt,
        blocks.createdAt,
        blocks.updatedAt,
      )
      .having(sql`count(distinct ${blockTags.tagId}) = ${uniqueTagIds.length}`)
      .orderBy(asc(blocks.position))
      .all();
  } else {
    blockRows = db
      .select(selectedFields)
      .from(blocks)
      .where(archivedPredicate)
      .orderBy(asc(blocks.position))
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
        return createBlockRecord(await services.getDb());
      },
    }),
    defineIpcCommandHandler({
      key: "blocksUpdateContent",
      async handle(request) {
        const db = await services.getDb();
        const result = db
          .update(blocks)
          .set({
            content: request.content,
            updatedAt: nowIsoString(),
          })
          .where(eq(blocks.id, request.blockId))
          .run();
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
        const result = db.delete(blocks).where(eq(blocks.id, request.blockId)).run();
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
          .update(blocks)
          .set({
            archivedAt: now,
            updatedAt: now,
          })
          .where(eq(blocks.id, request.blockId))
          .run();
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
          .update(blocks)
          .set({
            archivedAt: null,
            updatedAt: nowIsoString(),
          })
          .where(eq(blocks.id, request.blockId))
          .run();
        if (result.changes === 0) {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.blockId}`);
        }

        return getPublicBlockById(db, request.blockId);
      },
    }),
  ] as const;
}
