import { businessError, internalError } from "@shared/ipc/errors";
import { eq, inArray, sql } from "drizzle-orm";

import { assertBlockExists, getPublicBlockById } from "../blocks/block-records";
import type { AppDatabase } from "../database/database-client";
import { blockTags, blocks, tags } from "../database/database-schema";
import { isSqliteUniqueConstraint, nowIsoString } from "../database/db-utils";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import { mapTagRow } from "./tag-records";

interface TagsCommandServices {
  getDb: () => Promise<AppDatabase>;
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
          .select()
          .from(tags)
          .orderBy(sql`lower(${tags.name})`)
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
        const trimmedName = request.name.trim();

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
      },
    }),
    defineIpcCommandHandler({
      key: "tagsDelete",
      async handle(request) {
        const db = await services.getDb();
        const result = db.delete(tags).where(eq(tags.id, request.tagId)).run();
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

        const uniqueRequestedTagIds = Array.from(new Set(request.tagIds));
        const existingTagRows =
          uniqueRequestedTagIds.length > 0
            ? db
                .select({ id: tags.id })
                .from(tags)
                .where(inArray(tags.id, uniqueRequestedTagIds))
                .all()
            : [];
        const existingTagIds = new Set(existingTagRows.map((row) => row.id));
        const nextTagIds = uniqueRequestedTagIds.filter((tagId) => existingTagIds.has(tagId));

        db.transaction((tx) => {
          tx.delete(blockTags).where(eq(blockTags.blockId, request.blockId)).run();
          if (nextTagIds.length > 0) {
            tx.insert(blockTags)
              .values(
                nextTagIds.map((tagId) => ({
                  blockId: request.blockId,
                  tagId,
                })),
              )
              .run();
          }
          tx.update(blocks)
            .set({ updatedAt: nowIsoString() })
            .where(eq(blocks.id, request.blockId))
            .run();
        });

        return getPublicBlockById(db, request.blockId);
      },
    }),
  ] as const;
}
