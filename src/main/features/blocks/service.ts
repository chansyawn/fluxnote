import fs from "node:fs/promises";

import type { AppDatabase } from "@main/core/database/database-client";
import { blockTags, blocks, tags, type BlockRecord } from "@main/core/database/database-schema";
import { getSqliteChangedRows, nowIsoString } from "@main/core/database/db-utils";
import type { Block } from "@shared/features/blocks";
import type { Tag } from "@shared/features/tags";
import { businessError } from "@shared/ipc/errors";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

function mapTagRow(tag: { createdAt: string; id: string; name: string; updatedAt: string }): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

function mapBlockRow(block: BlockRecord, tags: Tag[]): Block {
  return {
    id: block.id,
    position: block.position,
    content: block.content,
    archivedAt: block.archivedAt,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    willArchive: false,
    tags,
  };
}

async function getTagsForBlocks(
  db: AppDatabase,
  blockIds: readonly string[],
): Promise<Map<string, Tag[]>> {
  if (blockIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      blockId: blockTags.blockId,
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(blockTags)
    .innerJoin(tags, eq(tags.id, blockTags.tagId))
    .where(inArray(blockTags.blockId, [...blockIds]))
    .orderBy(sql`lower(${tags.name})`)
    .all();

  const grouped = new Map<string, Tag[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.blockId) ?? [];
    bucket.push(mapTagRow(row));
    grouped.set(row.blockId, bucket);
  }
  return grouped;
}

async function getNextBlockPosition(db: AppDatabase): Promise<number> {
  const row = await db
    .select({
      maxPosition: sql<number>`coalesce(max(${blocks.position}), 0)`,
    })
    .from(blocks)
    .get();
  return (row?.maxPosition ?? 0) + 1;
}

export async function createBlockRecord(db: AppDatabase, content = ""): Promise<Block> {
  const now = nowIsoString();
  const blockId = crypto.randomUUID();

  await db
    .insert(blocks)
    .values({
      archivedAt: null,
      content,
      createdAt: now,
      id: blockId,
      position: await getNextBlockPosition(db),
      updatedAt: now,
    })
    .run();

  return await getPublicBlockById(db, blockId);
}

export async function assertBlockExists(db: AppDatabase, blockId: string): Promise<void> {
  const row = await db.select({ id: blocks.id }).from(blocks).where(eq(blocks.id, blockId)).get();
  if (!row) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }
}

export async function getPublicBlockById(db: AppDatabase, blockId: string): Promise<Block> {
  const block = await db.select().from(blocks).where(eq(blocks.id, blockId)).get();
  if (!block) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  const tagsByBlockId = await getTagsForBlocks(db, [blockId]);
  return mapBlockRow(block, tagsByBlockId.get(blockId) ?? []);
}

async function countBlocks(
  db: AppDatabase,
  tagIds: readonly string[],
  visibility: "active" | "archived",
  beforePosition?: { position: number; id: string },
): Promise<number> {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const beforePredicate = beforePosition
    ? sql`(${blocks.position} < ${beforePosition.position} OR (${blocks.position} = ${beforePosition.position} AND ${blocks.id} < ${beforePosition.id}))`
    : undefined;

  if (tagIds.length === 0) {
    const row = await db
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
  const row = await db
    .select({ totalCount: sql<number>`count(*)` })
    .from(filtered)
    .get();
  return row?.totalCount ?? 0;
}

export async function listBlocks(
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
    blockRows = await db
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
    blockRows = await db
      .select(selectedFields)
      .from(blocks)
      .where(archivedPredicate)
      .orderBy(asc(blocks.position), asc(blocks.id))
      .limit(limit)
      .offset(offset)
      .all();
  }

  const blockIds = blockRows.map((block) => block.id);
  const tagsByBlockId = await getTagsForBlocks(db, blockIds);
  return {
    blocks: blockRows.map((block) => mapBlockRow(block, tagsByBlockId.get(block.id) ?? [])),
    offset,
    limit,
    totalCount: await countBlocks(db, uniqueTagIds, visibility),
  };
}

export async function locateBlock(
  db: AppDatabase,
  blockId: string,
  tagIds: string[] | undefined,
  visibility: "active" | "archived",
) {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const uniqueTagIds = tagIds ? Array.from(new Set(tagIds)) : [];

  const targetBlock = await db
    .select({ id: blocks.id, position: blocks.position })
    .from(blocks)
    .where(and(archivedPredicate, eq(blocks.id, blockId)))
    .get();
  if (!targetBlock) {
    return null;
  }

  if (uniqueTagIds.length > 0) {
    const tagMatch = await db
      .select({ matchCount: sql<number>`count(distinct ${blockTags.tagId})` })
      .from(blockTags)
      .where(and(eq(blockTags.blockId, blockId), inArray(blockTags.tagId, uniqueTagIds)))
      .get();
    if (!tagMatch || tagMatch.matchCount < uniqueTagIds.length) {
      return null;
    }
  }

  const index = await countBlocks(db, uniqueTagIds, visibility, {
    position: targetBlock.position,
    id: targetBlock.id,
  });

  return {
    block: await getPublicBlockById(db, blockId),
    index,
  };
}

export async function updateBlockContent(
  db: AppDatabase,
  blockId: string,
  content: string,
): Promise<Block> {
  const result = await db
    .update(blocks)
    .set({
      content,
      updatedAt: nowIsoString(),
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId);
}

export async function archiveBlock(db: AppDatabase, blockId: string): Promise<Block> {
  const now = nowIsoString();
  const result = await db
    .update(blocks)
    .set({
      archivedAt: now,
      updatedAt: now,
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId);
}

export async function restoreBlock(db: AppDatabase, blockId: string): Promise<Block> {
  const result = await db
    .update(blocks)
    .set({
      archivedAt: null,
      updatedAt: nowIsoString(),
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId);
}

export async function deleteBlock(
  db: AppDatabase,
  blockId: string,
  assetPath: string,
): Promise<{ deletedBlockId: string }> {
  const result = await db.delete(blocks).where(eq(blocks.id, blockId)).run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  await fs.rm(assetPath, { force: true, recursive: true });
  return { deletedBlockId: blockId };
}
