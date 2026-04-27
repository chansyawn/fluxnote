import type { AppDatabase } from "@main/core/database/database-client";
import { blockTags, blocks, tags } from "@main/core/database/database-schema";
import { isSqliteUniqueConstraint, nowIsoString } from "@main/core/database/db-utils";
import type { Block } from "@shared/domains/blocks/models";
import type { Tag } from "@shared/domains/tags/models";
import { businessError, internalError } from "@shared/ipc/errors";
import { eq, inArray, sql } from "drizzle-orm";

import { assertBlockExists, getPublicBlockById } from "../blocks/service";
import { mapTagRow } from "./mapper";

export function listTags(db: AppDatabase): Tag[] {
  const rows = db
    .select()
    .from(tags)
    .orderBy(sql`lower(${tags.name})`)
    .all();
  return rows.map(mapTagRow);
}

export function createTag(db: AppDatabase, name: string): Tag {
  const now = nowIsoString();
  const tagId = crypto.randomUUID();
  const trimmedName = name.trim();

  try {
    db.insert(tags)
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

  const tagRow = db.select().from(tags).where(eq(tags.id, tagId)).get();
  if (!tagRow) {
    throw internalError("Failed to read created tag");
  }

  return mapTagRow(tagRow);
}

export function deleteTag(db: AppDatabase, tagId: string): void {
  const result = db.delete(tags).where(eq(tags.id, tagId)).run();
  if (result.changes === 0) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${tagId}`);
  }
}

export function setBlockTags(db: AppDatabase, blockId: string, tagIds: string[]): Block {
  assertBlockExists(db, blockId);

  const uniqueRequestedTagIds = Array.from(new Set(tagIds));
  const existingTagRows =
    uniqueRequestedTagIds.length > 0
      ? db.select({ id: tags.id }).from(tags).where(inArray(tags.id, uniqueRequestedTagIds)).all()
      : [];
  const existingTagIds = new Set(existingTagRows.map((row) => row.id));
  const nextTagIds = uniqueRequestedTagIds.filter((tagId) => existingTagIds.has(tagId));

  db.transaction((tx) => {
    tx.delete(blockTags).where(eq(blockTags.blockId, blockId)).run();
    if (nextTagIds.length > 0) {
      tx.insert(blockTags)
        .values(
          nextTagIds.map((tagId) => ({
            blockId,
            tagId,
          })),
        )
        .run();
    }
    tx.update(blocks).set({ updatedAt: nowIsoString() }).where(eq(blocks.id, blockId)).run();
  });

  return getPublicBlockById(db, blockId);
}
