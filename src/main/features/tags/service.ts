import type { AppDatabase } from "@main/core/database/database-client";
import { blockTags, blocks, tags, type TagRecord } from "@main/core/database/database-schema";
import {
  getSqliteChangedRows,
  isSqliteUniqueConstraint,
  nowIsoString,
} from "@main/core/database/db-utils";
import type { Block } from "@shared/features/blocks";
import type { Tag } from "@shared/features/tags";
import { businessError, internalError } from "@shared/ipc/errors";
import { eq, inArray, sql } from "drizzle-orm";

import { assertBlockExists, getPublicBlockById } from "../blocks/service";

function mapTagRow(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

export async function listTags(db: AppDatabase): Promise<Tag[]> {
  const rows = await db
    .select()
    .from(tags)
    .orderBy(sql`lower(${tags.name})`)
    .all();
  return rows.map(mapTagRow);
}

export async function createTag(db: AppDatabase, name: string): Promise<Tag> {
  const now = nowIsoString();
  const tagId = crypto.randomUUID();
  const trimmedName = name.trim();

  try {
    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: tagId,
        name: trimmedName,
        updatedAt: now,
      })
      .run();
  } catch (error) {
    if (isSqliteUniqueConstraint(error)) {
      throw businessError("BUSINESS.INVALID_OPERATION", "Tag already exists", {
        name: trimmedName,
      });
    }
    throw error;
  }

  const tagRow = await db.select().from(tags).where(eq(tags.id, tagId)).get();
  if (!tagRow) {
    throw internalError("Failed to read created tag");
  }

  return mapTagRow(tagRow);
}

export async function deleteTag(db: AppDatabase, tagId: string): Promise<void> {
  const result = await db.delete(tags).where(eq(tags.id, tagId)).run();
  if (getSqliteChangedRows(result) === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${tagId}`);
  }
}

export async function setBlockTags(
  db: AppDatabase,
  blockId: string,
  tagIds: string[],
): Promise<Block> {
  await assertBlockExists(db, blockId);

  const uniqueRequestedTagIds = Array.from(new Set(tagIds));
  const existingTagRows =
    uniqueRequestedTagIds.length > 0
      ? await db
          .select({ id: tags.id })
          .from(tags)
          .where(inArray(tags.id, uniqueRequestedTagIds))
          .all()
      : [];
  const existingTagIds = new Set(existingTagRows.map((row) => row.id));
  const nextTagIds = uniqueRequestedTagIds.filter((tagId) => existingTagIds.has(tagId));

  await db.transaction(async (tx) => {
    await tx.delete(blockTags).where(eq(blockTags.blockId, blockId)).run();
    if (nextTagIds.length > 0) {
      await tx
        .insert(blockTags)
        .values(
          nextTagIds.map((tagId) => ({
            blockId,
            tagId,
          })),
        )
        .run();
    }
    await tx.update(blocks).set({ updatedAt: nowIsoString() }).where(eq(blocks.id, blockId)).run();
  });

  return await getPublicBlockById(db, blockId);
}
