import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const blocks = sqliteTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull(),
    content: text("content").notNull().default(""),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_blocks_archived_at").on(table.archivedAt),
    index("idx_blocks_position").on(table.position),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("uq_tags_name_lower").on(sql`lower(${table.name})`)],
);

export const blockTags = sqliteTable(
  "block_tags",
  {
    blockId: text("block_id")
      .notNull()
      .references(() => blocks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.blockId, table.tagId] }),
    index("idx_block_tags_tag_id").on(table.tagId),
    index("idx_block_tags_block_id").on(table.blockId),
  ],
);

export type BlockRecord = typeof blocks.$inferSelect;
export type TagRecord = typeof tags.$inferSelect;
