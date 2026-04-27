import type { BlockRecord } from "@main/core/database/database-schema";
import type { Block, Tag } from "@shared/ipc/contracts";

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
