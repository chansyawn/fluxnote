import {
  createDatabaseClient,
  type DatabaseClient,
  type AppDatabase,
} from "@main/core/database/database-client";
import { migrateDatabase } from "@main/core/database/database-migrator";
import { blockTags, tags } from "@main/core/database/database-schema";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { createBlocksIpcCommands } from "./ipc-commands";

async function createTestDatabaseClient(): Promise<DatabaseClient> {
  const client = createDatabaseClient(":memory:");
  await migrateDatabase(client.db);
  return client;
}

function createHandlers(db: AppDatabase) {
  return createBlocksIpcCommands({
    getDb: async () => db,
    store: {
      getAssetPathForBlock: () => "",
    } as unknown as BackendStore,
  });
}

async function createBlock(db: AppDatabase) {
  const command = createHandlers(db).find((definition) => definition.key === "blocksCreate");
  if (!command || command.key !== "blocksCreate") {
    throw new Error("blocksCreate command not found");
  }

  return await command.handle(undefined, {} as never);
}

async function listBlocks(
  db: AppDatabase,
  request: {
    tagIds?: string[];
    visibility?: "active" | "archived";
    offset?: number;
    limit?: number;
  } = {},
) {
  const command = createHandlers(db).find((definition) => definition.key === "blocksList");
  if (!command || command.key !== "blocksList") {
    throw new Error("blocksList command not found");
  }

  return await command.handle(
    {
      limit: request.limit ?? 50,
      offset: request.offset ?? 0,
      tagIds: request.tagIds,
      visibility: request.visibility ?? "active",
    },
    {} as never,
  );
}

async function locateBlock(
  db: AppDatabase,
  request: {
    blockId: string;
    tagIds?: string[];
    visibility?: "active" | "archived";
  },
) {
  const command = createHandlers(db).find((definition) => definition.key === "blocksLocate");
  if (!command || command.key !== "blocksLocate") {
    throw new Error("blocksLocate command not found");
  }

  return await command.handle(
    {
      blockId: request.blockId,
      tagIds: request.tagIds,
      visibility: request.visibility ?? "active",
    },
    {} as never,
  );
}

describe("blocks ipc commands", () => {
  let client: DatabaseClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
  });

  async function getDb(): Promise<AppDatabase> {
    client = await createTestDatabaseClient();
    return client.db;
  }

  it("lists active blocks from oldest to newest so new blocks render at the bottom", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);

    const page = await listBlocks(db);

    expect(page.blocks.map((block) => block.id)).toEqual([
      firstBlock.id,
      secondBlock.id,
      thirdBlock.id,
    ]);
    expect(page.blocks.map((block) => block.position)).toEqual([1, 2, 3]);
    expect(page.totalCount).toBe(3);
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(50);
  });

  it("returns later pages with the same total count", async () => {
    const db = await getDb();
    const createdBlocks = [];
    for (let index = 0; index < 5; index += 1) {
      createdBlocks.push(await createBlock(db));
    }

    const page = await listBlocks(db, { limit: 2, offset: 2 });

    expect(page.blocks.map((block) => block.id)).toEqual([
      createdBlocks[2].id,
      createdBlocks[3].id,
    ]);
    expect(page.totalCount).toBe(5);
    expect(page.offset).toBe(2);
    expect(page.limit).toBe(2);
  });

  it("keeps tag-filtered blocks from oldest to newest", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    await createBlock(db);
    const thirdBlock = await createBlock(db);
    const now = new Date().toISOString();

    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    await db
      .insert(blockTags)
      .values([
        { blockId: firstBlock.id, tagId: "tag-feature" },
        { blockId: thirdBlock.id, tagId: "tag-feature" },
      ])
      .run();

    const page = await listBlocks(db, { tagIds: ["tag-feature"] });

    expect(page.blocks.map((block) => block.id)).toEqual([firstBlock.id, thirdBlock.id]);
    expect(page.totalCount).toBe(2);
  });

  it("paginates tag-filtered blocks with the correct total count", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    const now = new Date().toISOString();

    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    await db
      .insert(blockTags)
      .values([
        { blockId: firstBlock.id, tagId: "tag-feature" },
        { blockId: secondBlock.id, tagId: "tag-feature" },
        { blockId: thirdBlock.id, tagId: "tag-feature" },
      ])
      .run();

    const page = await listBlocks(db, { tagIds: ["tag-feature"], limit: 1, offset: 1 });

    expect(page.blocks.map((block) => block.id)).toEqual([secondBlock.id]);
    expect(page.totalCount).toBe(3);
  });

  it("paginates active and archived blocks independently", async () => {
    const db = await getDb();
    const activeBlock = await createBlock(db);
    const archivedBlock = await createBlock(db);

    await db.run(
      sql`UPDATE blocks SET archived_at = ${new Date().toISOString()} WHERE id = ${archivedBlock.id}`,
    );

    const activePage = await listBlocks(db, { visibility: "active" });
    const archivedPage = await listBlocks(db, { visibility: "archived" });

    expect(activePage.blocks.map((block) => block.id)).toEqual([activeBlock.id]);
    expect(activePage.totalCount).toBe(1);
    expect(archivedPage.blocks.map((block) => block.id)).toEqual([archivedBlock.id]);
    expect(archivedPage.totalCount).toBe(1);
  });

  it("locates blocks by zero-based index with the current filters", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    const now = new Date().toISOString();

    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    await db
      .insert(blockTags)
      .values([
        { blockId: firstBlock.id, tagId: "tag-feature" },
        { blockId: thirdBlock.id, tagId: "tag-feature" },
      ])
      .run();

    await expect(locateBlock(db, { blockId: secondBlock.id })).resolves.toMatchObject({
      block: { id: secondBlock.id },
      index: 1,
    });
    await expect(
      locateBlock(db, { blockId: thirdBlock.id, tagIds: ["tag-feature"] }),
    ).resolves.toMatchObject({
      block: { id: thirdBlock.id },
      index: 1,
    });
    await expect(
      locateBlock(db, { blockId: secondBlock.id, tagIds: ["tag-feature"] }),
    ).resolves.toBeNull();
  });

  it("locates archived blocks when visibility is archived", async () => {
    const db = await getDb();
    const activeBlock = await createBlock(db);
    const archivedBlockA = await createBlock(db);
    const archivedBlockB = await createBlock(db);

    await db.run(
      sql`UPDATE blocks SET archived_at = ${new Date().toISOString()} WHERE id IN (${archivedBlockA.id}, ${archivedBlockB.id})`,
    );

    await expect(
      locateBlock(db, { blockId: archivedBlockB.id, visibility: "archived" }),
    ).resolves.toMatchObject({ block: { id: archivedBlockB.id }, index: 1 });

    await expect(
      locateBlock(db, { blockId: activeBlock.id, visibility: "archived" }),
    ).resolves.toBeNull();
  });

  it("returns the correct total count from tag-filtered pages", async () => {
    const db = await getDb();
    const now = new Date().toISOString();
    const createdBlocks = [];
    for (let index = 0; index < 4; index += 1) {
      createdBlocks.push(await createBlock(db));
    }

    await db.insert(tags).values({ createdAt: now, id: "tag-a", name: "A", updatedAt: now }).run();
    await db
      .insert(blockTags)
      .values([
        { blockId: createdBlocks[0].id, tagId: "tag-a" },
        { blockId: createdBlocks[1].id, tagId: "tag-a" },
        { blockId: createdBlocks[3].id, tagId: "tag-a" },
      ])
      .run();

    const page = await listBlocks(db, { tagIds: ["tag-a"], limit: 1, offset: 0 });
    expect(page.totalCount).toBe(3);
    expect(page.blocks).toHaveLength(1);
  });

  it("creates blocks concurrently with unique ascending positions", async () => {
    const db = await getDb();
    const created = await Promise.all(
      Array.from({ length: 10 }, async () => await createBlock(db)),
    );

    const sortedPositions = created.map((block) => block.position).toSorted((a, b) => a - b);
    expect(sortedPositions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(sortedPositions).size).toBe(10);
  });
});
