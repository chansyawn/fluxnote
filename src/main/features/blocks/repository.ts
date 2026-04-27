import type { AppDatabase } from "@main/core/database/database-client";
import { blockTags, blocks, tags } from "@main/core/database/database-schema";
import type { Block, Tag } from "@shared/ipc/contracts";
import { businessError } from "@shared/ipc/errors";
import { eq, inArray, sql } from "drizzle-orm";

import { mapTagRow } from "../tags/mapper";
import { mapBlockRow } from "./mapper";

export function getTagsForBlocks(db: AppDatabase, blockIds: readonly string[]): Map<string, Tag[]> {
  if (blockIds.length === 0) {
    return new Map();
  }

  const rows = db
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

export function getPublicBlockById(db: AppDatabase, blockId: string): Block {
  const block = db.select().from(blocks).where(eq(blocks.id, blockId)).get();
  if (!block) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  const tagsByBlockId = getTagsForBlocks(db, [blockId]);
  return mapBlockRow(block, tagsByBlockId.get(blockId) ?? []);
}

export function assertBlockExists(db: AppDatabase, blockId: string): void {
  const row = db.select({ id: blocks.id }).from(blocks).where(eq(blocks.id, blockId)).get();
  if (!row) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }
}

export function getNextBlockPosition(db: AppDatabase): number {
  const row = db
    .select({
      maxPosition: sql<number>`coalesce(max(${blocks.position}), 0)`,
    })
    .from(blocks)
    .get();
  return (row?.maxPosition ?? 0) + 1;
}
