import fs from "node:fs/promises";

import type { AppDatabase } from "@main/core/database/database-client";
import { blockTags, blocks, tags, type BlockRecord } from "@main/core/database/database-schema";
import { getSqliteChangedRows, nowIsoString } from "@main/core/database/db-utils";
import type { Block } from "@shared/features/blocks";
import type { Tag } from "@shared/features/tags";
import { businessError } from "@shared/ipc/result";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { blockWillAutoArchive, type AutoArchiveEvaluationContext } from "./auto-archive-policy";

function mapTagRow(tag: { createdAt: string; id: string; name: string; updatedAt: string }): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

function mapBlockRow(
  block: BlockRecord,
  tags: Tag[],
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Block {
  return {
    id: block.id,
    content: block.content,
    contentUpdatedAt: block.contentUpdatedAt,
    archivedAt: block.archivedAt,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    willArchive: autoArchiveContext ? blockWillAutoArchive(block, autoArchiveContext) : false,
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

export async function createBlockRecord(db: AppDatabase, content = ""): Promise<Block> {
  const blockId = crypto.randomUUID();

  await db
    .insert(blocks)
    .values({
      archivedAt: null,
      content,
      id: blockId,
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

export async function getPublicBlockById(
  db: AppDatabase,
  blockId: string,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<Block> {
  const block = await db.select().from(blocks).where(eq(blocks.id, blockId)).get();
  if (!block) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  const tagsByBlockId = await getTagsForBlocks(db, [blockId]);
  return mapBlockRow(block, tagsByBlockId.get(blockId) ?? [], autoArchiveContext);
}

async function countBlocks(
  db: AppDatabase,
  tagIds: readonly string[],
  visibility: "active" | "archived",
  beforeCreatedAt?: { createdAt: string; id: string },
): Promise<number> {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const beforePredicate = beforeCreatedAt
    ? sql`(${blocks.createdAt} > ${beforeCreatedAt.createdAt} OR (${blocks.createdAt} = ${beforeCreatedAt.createdAt} AND ${blocks.id} > ${beforeCreatedAt.id}))`
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
  autoArchiveContext?: AutoArchiveEvaluationContext,
) {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const selectedFields = {
    archivedAt: blocks.archivedAt,
    content: blocks.content,
    contentUpdatedAt: blocks.contentUpdatedAt,
    createdAt: blocks.createdAt,
    id: blocks.id,
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
        blocks.content,
        blocks.contentUpdatedAt,
        blocks.archivedAt,
        blocks.createdAt,
        blocks.updatedAt,
      )
      .having(sql`count(distinct ${blockTags.tagId}) = ${uniqueTagIds.length}`)
      .orderBy(desc(blocks.createdAt), desc(blocks.id))
      .limit(limit)
      .offset(offset)
      .all();
  } else {
    blockRows = await db
      .select(selectedFields)
      .from(blocks)
      .where(archivedPredicate)
      .orderBy(desc(blocks.createdAt), desc(blocks.id))
      .limit(limit)
      .offset(offset)
      .all();
  }

  const blockIds = blockRows.map((block) => block.id);
  const tagsByBlockId = await getTagsForBlocks(db, blockIds);
  return {
    blocks: blockRows.map((block) =>
      mapBlockRow(block, tagsByBlockId.get(block.id) ?? [], autoArchiveContext),
    ),
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
  autoArchiveContext?: AutoArchiveEvaluationContext,
) {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const uniqueTagIds = tagIds ? Array.from(new Set(tagIds)) : [];

  const targetBlock = await db
    .select({ id: blocks.id, createdAt: blocks.createdAt })
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
    createdAt: targetBlock.createdAt,
    id: targetBlock.id,
  });

  return {
    block: await getPublicBlockById(db, blockId, autoArchiveContext),
    index,
  };
}

export async function updateBlockContent(
  db: AppDatabase,
  blockId: string,
  content: string,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<Block> {
  const result = await db
    .update(blocks)
    .set({
      content,
      contentUpdatedAt: nowIsoString(),
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId, autoArchiveContext);
}

export async function archiveBlock(
  db: AppDatabase,
  blockId: string,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<Block> {
  const now = nowIsoString();
  const result = await db
    .update(blocks)
    .set({
      archivedAt: now,
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId, autoArchiveContext);
}

export async function restoreBlock(
  db: AppDatabase,
  blockId: string,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<Block> {
  const result = await db
    .update(blocks)
    .set({
      archivedAt: null,
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId, autoArchiveContext);
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
