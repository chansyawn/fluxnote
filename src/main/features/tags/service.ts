import type { AppDatabase } from "@main/core/database";
import { blockTags, tags, type TagRecord } from "@main/core/database";
import { getSqliteChangedRows, isSqliteUniqueConstraint } from "@main/core/database";
import type { Block } from "@shared/features/blocks/models";
import { tagSchema, type Tag } from "@shared/features/tags/models";
import { businessError, internalError } from "@shared/ipc/result";
import { eq, inArray, or, sql } from "drizzle-orm";

import { assertBlockExists, getPublicBlockById } from "../blocks/service";

function mapTagRow(tag: TagRecord): Tag {
  return tagSchema.parse({
    color: tag.color,
    id: tag.id,
    icon: tag.icon,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  });
}

function normalizeTagNames(tagNames: readonly string[]): string[] {
  const normalized = new Map<string, string>();
  for (const tagName of tagNames) {
    const trimmedName = tagName.trim();
    if (trimmedName.length > 0) {
      normalized.set(trimmedName.toLowerCase(), trimmedName);
    }
  }
  return [...normalized.values()];
}

export async function listTags(db: AppDatabase): Promise<Tag[]> {
  const rows = await db
    .select()
    .from(tags)
    .orderBy(sql`lower(${tags.name})`)
    .all();
  return rows.map(mapTagRow);
}

async function listTagsByName(db: AppDatabase, tagNames: readonly string[]): Promise<Tag[]> {
  if (tagNames.length === 0) {
    return [];
  }

  const predicates = tagNames.map((tagName) => sql`lower(${tags.name}) = ${tagName.toLowerCase()}`);
  const rows = await db
    .select()
    .from(tags)
    .where(or(...predicates))
    .all();
  return rows.map(mapTagRow);
}

export async function createTag(
  db: AppDatabase,
  name: string,
  color: Tag["color"] = null,
): Promise<Tag> {
  const tagId = crypto.randomUUID();
  const trimmedName = name.trim();

  try {
    await db
      .insert(tags)
      .values({
        color,
        id: tagId,
        icon: null,
        name: trimmedName,
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

export async function updateTag(
  db: AppDatabase,
  tagId: string,
  input: Pick<Tag, "color" | "icon" | "name">,
): Promise<Tag> {
  const trimmedName = input.name.trim();
  const existingTag = await db.select({ id: tags.id }).from(tags).where(eq(tags.id, tagId)).get();
  if (!existingTag) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${tagId}`);
  }

  try {
    await db
      .update(tags)
      .set({
        color: input.color,
        icon: input.icon,
        name: trimmedName,
      })
      .where(eq(tags.id, tagId))
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
    throw internalError("Failed to read updated tag");
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
  });

  return await getPublicBlockById(db, blockId);
}

export async function setBlockTagsByName(
  db: AppDatabase,
  blockId: string,
  tagNames: string[],
): Promise<Block> {
  await assertBlockExists(db, blockId);

  const normalizedTagNames = normalizeTagNames(tagNames);
  if (normalizedTagNames.length === 0) {
    return await setBlockTags(db, blockId, []);
  }

  await db
    .insert(tags)
    .values(
      normalizedTagNames.map((tagName) => ({
        color: null,
        id: crypto.randomUUID(),
        icon: null,
        name: tagName,
      })),
    )
    .onConflictDoNothing()
    .run();

  const resolvedTags = await listTagsByName(db, normalizedTagNames);

  return await setBlockTags(
    db,
    blockId,
    resolvedTags.map((tag) => tag.id),
  );
}
