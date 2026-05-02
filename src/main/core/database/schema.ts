import { sql } from "drizzle-orm";
import { index, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const sqliteNowIsoExpression = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const blocks = sqliteTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    content: text("content").notNull().default(""),
    contentUpdatedAt: text("content_updated_at").notNull().default(sqliteNowIsoExpression),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull().default(sqliteNowIsoExpression),
    updatedAt: text("updated_at")
      .notNull()
      .default(sqliteNowIsoExpression)
      .$onUpdateFn(() => sqliteNowIsoExpression),
  },
  (table) => [
    index("idx_blocks_archived_at").on(table.archivedAt),
    index("idx_blocks_created_at").on(table.createdAt),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull().default(sqliteNowIsoExpression),
    updatedAt: text("updated_at")
      .notNull()
      .default(sqliteNowIsoExpression)
      .$onUpdateFn(() => sqliteNowIsoExpression),
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
