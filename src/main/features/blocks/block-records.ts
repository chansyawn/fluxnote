import type { Block, Tag } from "@shared/ipc/contracts";
import { businessError } from "@shared/ipc/errors";
import { eq, inArray, sql } from "drizzle-orm";

import type { AppDatabase } from "../database/database-client";
import {
  blockTags,
  blocks,
  tags,
  type BlockRecord,
  type TagRecord,
} from "../database/database-schema";

export const assetUrlScheme = "assets://";

export function nowIsoString(): string {
  return new Date().toISOString();
}

export function sanitizeFileName(fileName: string): string {
  return (
    fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 120) || "asset"
  );
}

export function extFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export function splitAssetUrl(assetUrl: string): { blockId: string; fileName: string } {
  if (!assetUrl.startsWith(assetUrlScheme)) {
    throw businessError("BUSINESS.INVALID_INVOKE", "Invalid asset url", { assetUrl });
  }

  const suffix = assetUrl.slice(assetUrlScheme.length);
  const [blockId, ...fileNameParts] = suffix.split("/");
  const fileName = fileNameParts.join("/");
  if (!blockId || !fileName) {
    throw businessError("BUSINESS.INVALID_INVOKE", "Invalid asset url", { assetUrl });
  }

  return { blockId, fileName };
}

export function mapTagRow(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

export function mapBlockRow(block: BlockRecord, tags: Tag[]): Block {
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

export function isSqliteUniqueConstraint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("UNIQUE constraint failed");
}
