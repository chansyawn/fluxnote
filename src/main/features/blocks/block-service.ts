import fs from "node:fs/promises";

import type { Block } from "@shared/ipc/contracts";
import { businessError } from "@shared/ipc/errors";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import type { AppDatabase } from "../database/database-client";
import { blockTags, blocks, type BlockRecord } from "../database/database-schema";
import { nowIsoString } from "../database/db-utils";
import {
  getNextBlockPosition,
  getPublicBlockById,
  getTagsForBlocks,
  mapBlockRow,
} from "./block-records";

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

function countBlocks(
  db: AppDatabase,
  tagIds: readonly string[],
  visibility: "active" | "archived",
  beforePosition?: { position: number; id: string },
): number {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const beforePredicate = beforePosition
    ? sql`(${blocks.position} < ${beforePosition.position} OR (${blocks.position} = ${beforePosition.position} AND ${blocks.id} < ${beforePosition.id}))`
    : undefined;

  if (tagIds.length === 0) {
    const row = db
      .select({ totalCount: sql<number>`count(*)` })
      .from(blocks)
      .where(and(archivedPredicate, beforePredicate))
      .get();
    return row?.totalCount ?? 0;
  }

  const filtered = db
    .select({ id: blocks.id })
    .from(blocks)
    .innerJoin(blockTags, eq(blockTags.blockId, blocks.id))
    .where(and(archivedPredicate, inArray(blockTags.tagId, [...tagIds]), beforePredicate))
    .groupBy(blocks.id)
    .having(sql`count(distinct ${blockTags.tagId}) = ${tagIds.length}`)
    .as("filtered");
  const row = db
    .select({ totalCount: sql<number>`count(*)` })
    .from(filtered)
    .get();
  return row?.totalCount ?? 0;
}

export function listBlocks(
  db: AppDatabase,
  tagIds: string[] | undefined,
  visibility: "active" | "archived",
  offset: number,
  limit: number,
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
      .orderBy(asc(blocks.position), asc(blocks.id))
      .limit(limit)
      .offset(offset)
      .all();
  } else {
    blockRows = db
      .select(selectedFields)
      .from(blocks)
      .where(archivedPredicate)
      .orderBy(asc(blocks.position), asc(blocks.id))
      .limit(limit)
      .offset(offset)
      .all();
  }

  const blockIds = blockRows.map((block) => block.id);
  const tagsByBlockId = getTagsForBlocks(db, blockIds);
  return {
    blocks: blockRows.map((block) => mapBlockRow(block, tagsByBlockId.get(block.id) ?? [])),
    offset,
    limit,
    totalCount: countBlocks(db, uniqueTagIds, visibility),
  };
}

export function locateBlock(
  db: AppDatabase,
  blockId: string,
  tagIds: string[] | undefined,
  visibility: "active" | "archived",
) {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const uniqueTagIds = tagIds ? Array.from(new Set(tagIds)) : [];

  const targetBlock = db
    .select({ id: blocks.id, position: blocks.position })
    .from(blocks)
    .where(and(archivedPredicate, eq(blocks.id, blockId)))
    .get();
  if (!targetBlock) {
    return null;
  }

  if (uniqueTagIds.length > 0) {
    const tagMatch = db
      .select({ matchCount: sql<number>`count(distinct ${blockTags.tagId})` })
      .from(blockTags)
      .where(and(eq(blockTags.blockId, blockId), inArray(blockTags.tagId, uniqueTagIds)))
      .get();
    if (!tagMatch || tagMatch.matchCount < uniqueTagIds.length) {
      return null;
    }
  }

  const index = countBlocks(db, uniqueTagIds, visibility, {
    position: targetBlock.position,
    id: targetBlock.id,
  });

  return {
    block: getPublicBlockById(db, blockId),
    index,
  };
}

export function updateBlockContent(db: AppDatabase, blockId: string, content: string): Block {
  const result = db
    .update(blocks)
    .set({
      content,
      updatedAt: nowIsoString(),
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (result.changes === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return getPublicBlockById(db, blockId);
}

export function archiveBlock(db: AppDatabase, blockId: string): Block {
  const now = nowIsoString();
  const result = db
    .update(blocks)
    .set({
      archivedAt: now,
      updatedAt: now,
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (result.changes === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return getPublicBlockById(db, blockId);
}

export function restoreBlock(db: AppDatabase, blockId: string): Block {
  const result = db
    .update(blocks)
    .set({
      archivedAt: null,
      updatedAt: nowIsoString(),
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (result.changes === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return getPublicBlockById(db, blockId);
}

export async function deleteBlock(
  db: AppDatabase,
  blockId: string,
  assetPath: string,
): Promise<{ deletedBlockId: string }> {
  const result = db.delete(blocks).where(eq(blocks.id, blockId)).run();
  if (result.changes === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  await fs.rm(assetPath, { force: true, recursive: true });
  return { deletedBlockId: blockId };
}
