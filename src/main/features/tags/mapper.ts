import type { TagRecord } from "@main/core/database/database-schema";
import type { Tag } from "@shared/ipc/contracts";

export function mapTagRow(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}
