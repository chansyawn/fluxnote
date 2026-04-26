import type { Tag } from "@shared/ipc/contracts";

import type { TagRecord } from "../database/database-schema";

export function mapTagRow(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}
