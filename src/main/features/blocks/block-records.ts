import type { Block, Tag } from "@shared/ipc/contracts";
import { businessError } from "@shared/ipc/errors";

import type { SqliteDatabase } from "../backend-store";

export interface BlockRow {
  id: string;
  position: number;
  content: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TagJoinRow extends TagRow {
  block_id: string;
}

export const assetUrlScheme = "assets://";

export function nowIsoString(): string {
  return new Date().toISOString();
}

export function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(",");
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

export function mapTagRow(tag: TagRow): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  };
}

export function mapBlockRow(block: BlockRow, tags: Tag[]): Block {
  return {
    id: block.id,
    position: block.position,
    content: block.content,
    archivedAt: block.archived_at,
    createdAt: block.created_at,
    updatedAt: block.updated_at,
    willArchive: false,
    tags,
  };
}

export function getTagsForBlocks(
  db: SqliteDatabase,
  blockIds: readonly string[],
): Map<string, Tag[]> {
  if (blockIds.length === 0) {
    return new Map();
  }

  const rows = db
    .prepare<TagJoinRow>(
      `
      SELECT
        bt.block_id AS block_id,
        t.id,
        t.name,
        t.created_at,
        t.updated_at
      FROM block_tags bt
      INNER JOIN tags t ON t.id = bt.tag_id
      WHERE bt.block_id IN (${placeholders(blockIds.length)})
      ORDER BY t.name COLLATE NOCASE ASC
    `,
    )
    .all(...blockIds);

  const grouped = new Map<string, Tag[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.block_id) ?? [];
    bucket.push(mapTagRow(row));
    grouped.set(row.block_id, bucket);
  }
  return grouped;
}

export function getPublicBlockById(db: SqliteDatabase, blockId: string): Block {
  const block = db
    .prepare<BlockRow>(
      `
        SELECT
          id,
          position,
          content,
          archived_at,
          created_at,
          updated_at
        FROM blocks
        WHERE id = ?
      `,
    )
    .get(blockId);
  if (!block) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }

  const tagsByBlockId = getTagsForBlocks(db, [blockId]);
  return mapBlockRow(block, tagsByBlockId.get(blockId) ?? []);
}

export function assertBlockExists(db: SqliteDatabase, blockId: string): void {
  const row = db.prepare<{ id: string }>("SELECT id FROM blocks WHERE id = ?").get(blockId);
  if (!row) {
    throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${blockId}`);
  }
}

export function isSqliteUniqueConstraint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("UNIQUE constraint failed");
}
