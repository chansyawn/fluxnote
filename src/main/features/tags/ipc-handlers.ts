import { businessError, internalError } from "@shared/ipc/errors";

import type { SqliteDatabase } from "../backend-store";
import {
  assertBlockExists,
  getPublicBlockById,
  isSqliteUniqueConstraint,
  mapTagRow,
  nowIsoString,
  placeholders,
  type TagRow,
} from "../blocks/block-records";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";

interface TagsCommandServices {
  getDb: () => Promise<SqliteDatabase>;
}

export function createTagsCommandHandlers(
  services: TagsCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "tagsList",
      async handle() {
        const db = await services.getDb();
        const rows = db
          .prepare<TagRow>(
            `
              SELECT id, name, created_at, updated_at
              FROM tags
              ORDER BY name COLLATE NOCASE ASC
            `,
          )
          .all();
        return rows.map(mapTagRow);
      },
    }),
    defineIpcCommandHandler({
      key: "tagsCreate",
      async handle(request) {
        const db = await services.getDb();
        const now = nowIsoString();
        const tagId = crypto.randomUUID();

        try {
          db.prepare(
            `
            INSERT INTO tags (id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `,
          ).run(tagId, request.name.trim(), now, now);
        } catch (error) {
          if (isSqliteUniqueConstraint(error)) {
            throw businessError("BUSINESS.INVALID_OPERATION", "Tag already exists", {
              name: request.name.trim(),
            });
          }
          throw error;
        }

        const tagRow = db
          .prepare<TagRow>("SELECT id, name, created_at, updated_at FROM tags WHERE id = ?")
          .get(tagId);
        if (!tagRow) {
          throw internalError("Failed to read created tag");
        }

        return mapTagRow(tagRow);
      },
    }),
    defineIpcCommandHandler({
      key: "tagsDelete",
      async handle(request) {
        const db = await services.getDb();
        const result = db.prepare("DELETE FROM tags WHERE id = ?").run(request.tagId);
        if (result.changes === 0) {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.tagId}`);
        }

        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "tagsSetBlockTags",
      async handle(request) {
        const db = await services.getDb();
        assertBlockExists(db, request.blockId);

        const existingTagRows = db
          .prepare<{ id: string }>(
            `
              SELECT id
              FROM tags
              WHERE id IN (${request.tagIds.length > 0 ? placeholders(request.tagIds.length) : "NULL"})
            `,
          )
          .all(...request.tagIds);
        const existingTagIds = new Set(existingTagRows.map((row) => row.id));
        const nextTagIds = Array.from(new Set(request.tagIds)).filter((tagId) =>
          existingTagIds.has(tagId),
        );

        const apply = db.transaction(() => {
          db.prepare("DELETE FROM block_tags WHERE block_id = ?").run(request.blockId);
          const insertTag = db.prepare("INSERT INTO block_tags (block_id, tag_id) VALUES (?, ?)");
          for (const tagId of nextTagIds) {
            insertTag.run(request.blockId, tagId);
          }
          db.prepare("UPDATE blocks SET updated_at = ? WHERE id = ?").run(
            nowIsoString(),
            request.blockId,
          );
        });
        apply();

        return getPublicBlockById(db, request.blockId);
      },
    }),
  ] as const;
}
