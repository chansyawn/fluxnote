import fs from "node:fs/promises";

import type { AppDatabase } from "@main/core/database";
import { blockTags, blocks, tags, type BlockRecord } from "@main/core/database";
import { getSqliteChangedRows, nowIsoString } from "@main/core/database";
import type { Block, blockReorderOperationSchema } from "@shared/features/blocks/models";
import type { Tag } from "@shared/features/tags/models";
import { businessError } from "@shared/ipc/result";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { z } from "zod";

import {
  blockHasPendingAutoArchive,
  type AutoArchiveEvaluationContext,
} from "./auto-archive-policy";

type AppDbTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];
type BlocksDb = AppDatabase | AppDbTransaction;
type BlockReorderOperation = z.infer<typeof blockReorderOperationSchema>;

interface BlockOrderRow {
  id: string;
  archivedAt: string | null;
  createdAt: string;
  isPinned: boolean;
  orderIndex: number;
}

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
    isKept: block.isKept,
    isPinned: block.isPinned,
    orderIndex: block.orderIndex,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    isPendingAutoArchive: autoArchiveContext
      ? blockHasPendingAutoArchive(block, autoArchiveContext)
      : false,
    tags,
  };
}

async function getTagsForBlocks(
  db: BlocksDb,
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

async function getTopOrderIndex(db: BlocksDb, isPinned: boolean): Promise<number> {
  const topBlock = await db
    .select({ orderIndex: blocks.orderIndex })
    .from(blocks)
    .where(and(isNull(blocks.archivedAt), eq(blocks.isPinned, isPinned)))
    .orderBy(asc(blocks.orderIndex), desc(blocks.createdAt), desc(blocks.id))
    .limit(1)
    .get();

  return topBlock ? topBlock.orderIndex - 1 : 0;
}

async function listActiveOrderRows(db: BlocksDb): Promise<BlockOrderRow[]> {
  return await db
    .select({
      id: blocks.id,
      archivedAt: blocks.archivedAt,
      createdAt: blocks.createdAt,
      isPinned: blocks.isPinned,
      orderIndex: blocks.orderIndex,
    })
    .from(blocks)
    .where(isNull(blocks.archivedAt))
    .orderBy(desc(blocks.isPinned), asc(blocks.orderIndex), desc(blocks.createdAt), desc(blocks.id))
    .all();
}

async function getVisibleBlockIdSet(
  db: BlocksDb,
  tagIds: readonly string[],
): Promise<Set<string> | null> {
  const uniqueTagIds = Array.from(new Set(tagIds));
  if (uniqueTagIds.length === 0) {
    return null;
  }

  const rows = await db
    .select({ id: blockTags.blockId })
    .from(blockTags)
    .where(inArray(blockTags.tagId, uniqueTagIds))
    .groupBy(blockTags.blockId)
    .having(sql`count(distinct ${blockTags.tagId}) = ${uniqueTagIds.length}`)
    .all();

  return new Set(rows.map((row) => row.id));
}

function moveBlockOrderRow(
  partitionRows: readonly BlockOrderRow[],
  visibleRows: readonly BlockOrderRow[],
  targetBlockId: string,
  operation: BlockReorderOperation,
): BlockOrderRow[] | null {
  const visibleIndex = visibleRows.findIndex((row) => row.id === targetBlockId);
  if (visibleIndex === -1) {
    throw businessError(
      "BUSINESS.INVALID_OPERATION",
      "Block is outside the current workspace view",
      {
        blockId: targetBlockId,
      },
    );
  }

  const anchor =
    operation === "move-down" ? visibleRows[visibleIndex + 1] : visibleRows[visibleIndex - 1];
  if (operation !== "move-to-top" && !anchor) {
    return null;
  }
  if (operation === "move-to-top" && visibleIndex === 0) {
    return null;
  }

  const target = partitionRows.find((row) => row.id === targetBlockId);
  if (!target) {
    return null;
  }

  const rowsWithoutTarget = partitionRows.filter((row) => row.id !== targetBlockId);
  const anchorId = operation === "move-to-top" ? visibleRows[0].id : anchor?.id;
  const anchorIndex = rowsWithoutTarget.findIndex((row) => row.id === anchorId);
  if (anchorIndex === -1) {
    return null;
  }

  const insertIndex = operation === "move-down" ? anchorIndex + 1 : anchorIndex;
  return [
    ...rowsWithoutTarget.slice(0, insertIndex),
    target,
    ...rowsWithoutTarget.slice(insertIndex),
  ];
}

export async function createBlockRecord(db: AppDatabase, content = ""): Promise<Block> {
  const blockId = crypto.randomUUID();
  const orderIndex = await getTopOrderIndex(db, false);

  await db
    .insert(blocks)
    .values({
      archivedAt: null,
      content,
      id: blockId,
      isPinned: false,
      orderIndex,
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
  beforeBlock?: BlockOrderRow,
): Promise<number> {
  const archivedPredicate =
    visibility === "archived" ? isNotNull(blocks.archivedAt) : isNull(blocks.archivedAt);
  const beforePredicate = beforeBlock
    ? visibility === "active"
      ? sql`(${blocks.isPinned} > ${beforeBlock.isPinned ? 1 : 0} OR (${blocks.isPinned} = ${beforeBlock.isPinned ? 1 : 0} AND (${blocks.orderIndex} < ${beforeBlock.orderIndex} OR (${blocks.orderIndex} = ${beforeBlock.orderIndex} AND (${blocks.createdAt} > ${beforeBlock.createdAt} OR (${blocks.createdAt} = ${beforeBlock.createdAt} AND ${blocks.id} > ${beforeBlock.id}))))))`
      : sql`(${blocks.archivedAt} > ${beforeBlock.archivedAt} OR (${blocks.archivedAt} = ${beforeBlock.archivedAt} AND ${blocks.id} > ${beforeBlock.id}))`
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
    isKept: blocks.isKept,
    isPinned: blocks.isPinned,
    orderIndex: blocks.orderIndex,
    updatedAt: blocks.updatedAt,
  } satisfies Record<string, unknown>;
  const orderBy =
    visibility === "active"
      ? [desc(blocks.isPinned), asc(blocks.orderIndex), desc(blocks.createdAt), desc(blocks.id)]
      : [desc(blocks.archivedAt), desc(blocks.id)];

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
        blocks.isKept,
        blocks.isPinned,
        blocks.orderIndex,
        blocks.updatedAt,
      )
      .having(sql`count(distinct ${blockTags.tagId}) = ${uniqueTagIds.length}`)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset)
      .all();
  } else {
    blockRows = await db
      .select(selectedFields)
      .from(blocks)
      .where(archivedPredicate)
      .orderBy(...orderBy)
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
    .select({
      id: blocks.id,
      archivedAt: blocks.archivedAt,
      createdAt: blocks.createdAt,
      isPinned: blocks.isPinned,
      orderIndex: blocks.orderIndex,
    })
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
    archivedAt: targetBlock.archivedAt,
    createdAt: targetBlock.createdAt,
    id: targetBlock.id,
    isPinned: targetBlock.isPinned,
    orderIndex: targetBlock.orderIndex,
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
  if (autoArchiveContext?.protectedBlockIds.has(blockId)) {
    throw businessError(
      "BUSINESS.INVALID_OPERATION",
      "Blocks with active external edits cannot be archived",
      { blockId },
    );
  }

  const now = nowIsoString();
  const result = await db
    .update(blocks)
    .set({
      archivedAt: now,
      isKept: false,
      isPinned: false,
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
  const orderIndex = await getTopOrderIndex(db, false);
  const result = await db
    .update(blocks)
    .set({
      archivedAt: null,
      isPinned: false,
      orderIndex,
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId, autoArchiveContext);
}

export async function reorderBlock(
  db: AppDatabase,
  blockId: string,
  operation: BlockReorderOperation,
  tagIds: string[] | undefined,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<{ block: Block; changed: boolean }> {
  const changed = await db.transaction(async (tx) => {
    const targetBlock = await tx
      .select({ archivedAt: blocks.archivedAt, id: blocks.id })
      .from(blocks)
      .where(eq(blocks.id, blockId))
      .get();
    if (!targetBlock) {
      throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
    }
    if (targetBlock.archivedAt !== null) {
      throw businessError("BUSINESS.INVALID_OPERATION", "Archived blocks cannot be reordered", {
        blockId,
      });
    }

    const activeRows = await listActiveOrderRows(tx);
    const targetRow = activeRows.find((row) => row.id === blockId);
    if (!targetRow) {
      throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
    }

    const visibleBlockIds = await getVisibleBlockIdSet(tx, tagIds ?? []);
    const partitionRows = activeRows.filter((row) => row.isPinned === targetRow.isPinned);
    const visiblePartitionRows = partitionRows.filter(
      (row) => !visibleBlockIds || visibleBlockIds.has(row.id),
    );
    const reorderedRows = moveBlockOrderRow(
      partitionRows,
      visiblePartitionRows,
      blockId,
      operation,
    );

    if (!reorderedRows) {
      return false;
    }

    const changedOrder = reorderedRows.some((row, index) => row.id !== partitionRows[index]?.id);
    if (!changedOrder) {
      return false;
    }

    for (const [orderIndex, row] of reorderedRows.entries()) {
      await tx.update(blocks).set({ orderIndex }).where(eq(blocks.id, row.id)).run();
    }
    return true;
  });

  return {
    block: await getPublicBlockById(db, blockId, autoArchiveContext),
    changed,
  };
}

export async function setBlockKeepState(
  db: AppDatabase,
  blockId: string,
  isKept: boolean,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<Block> {
  const targetBlock = await db
    .select({ id: blocks.id, isPinned: blocks.isPinned })
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .get();
  if (!targetBlock) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }
  if (targetBlock.isPinned) {
    throw businessError("BUSINESS.INVALID_OPERATION", "Pinned blocks cannot change keep state", {
      blockId,
    });
  }
  if (autoArchiveContext?.protectedBlockIds.has(blockId)) {
    throw businessError(
      "BUSINESS.INVALID_OPERATION",
      "Blocks with active external edits cannot change keep state",
      { blockId },
    );
  }

  const result = await db
    .update(blocks)
    .set({
      isKept,
    })
    .where(eq(blocks.id, blockId))
    .run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  return await getPublicBlockById(db, blockId, autoArchiveContext);
}

export async function setBlockPinnedState(
  db: AppDatabase,
  blockId: string,
  isPinned: boolean,
  autoArchiveContext?: AutoArchiveEvaluationContext,
): Promise<Block> {
  await db.transaction(async (tx) => {
    const targetBlock = await tx
      .select({ archivedAt: blocks.archivedAt, id: blocks.id, isPinned: blocks.isPinned })
      .from(blocks)
      .where(eq(blocks.id, blockId))
      .get();
    if (!targetBlock) {
      throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
    }
    if (targetBlock.archivedAt !== null) {
      throw businessError("BUSINESS.INVALID_OPERATION", "Archived blocks cannot be pinned", {
        blockId,
      });
    }
    if (targetBlock.isPinned === isPinned) {
      return;
    }

    const orderIndex = await getTopOrderIndex(tx, isPinned);
    await tx
      .update(blocks)
      .set({
        isPinned,
        orderIndex,
      })
      .where(eq(blocks.id, blockId))
      .run();
  });

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

export async function deleteArchivedBlocks(
  db: AppDatabase,
  getAssetPathForBlock: (blockId: string) => string,
): Promise<{ deletedCount: number }> {
  const archivedBlockRows = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(isNotNull(blocks.archivedAt))
    .all();
  const archivedBlockIds = archivedBlockRows.map((block) => block.id);
  if (archivedBlockIds.length === 0) {
    return { deletedCount: 0 };
  }

  await db.delete(blocks).where(inArray(blocks.id, archivedBlockIds)).run();
  await Promise.all(
    archivedBlockIds.map(async (blockId) => {
      await fs.rm(getAssetPathForBlock(blockId), { force: true, recursive: true });
    }),
  );

  return { deletedCount: archivedBlockIds.length };
}
