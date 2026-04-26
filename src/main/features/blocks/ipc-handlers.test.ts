import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { BackendStore } from "../backend-store";
import {
  createDatabaseClient,
  type DatabaseClient,
  type AppDatabase,
} from "../database/database-client";
import { blockTags, tags } from "../database/database-schema";
import { createBlocksCommandHandlers } from "./ipc-handlers";

function createTestDatabaseClient(): DatabaseClient {
  const client = createDatabaseClient(":memory:");

  client.db.run(sql`
    CREATE TABLE blocks (
      id text PRIMARY KEY NOT NULL,
      position integer NOT NULL,
      content text DEFAULT '' NOT NULL,
      archived_at text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )
  `);
  client.db.run(sql`CREATE INDEX idx_blocks_archived_at ON blocks (archived_at)`);
  client.db.run(sql`CREATE INDEX idx_blocks_position ON blocks (position)`);
  client.db.run(sql`
    CREATE TABLE tags (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )
  `);
  client.db.run(sql`CREATE UNIQUE INDEX uq_tags_name_lower ON tags (lower("name"))`);
  client.db.run(sql`
    CREATE TABLE block_tags (
      block_id text NOT NULL,
      tag_id text NOT NULL,
      PRIMARY KEY (block_id, tag_id),
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
  client.db.run(sql`CREATE INDEX idx_block_tags_tag_id ON block_tags (tag_id)`);
  client.db.run(sql`CREATE INDEX idx_block_tags_block_id ON block_tags (block_id)`);

  return client;
}

function createHandlers(db: AppDatabase) {
  return createBlocksCommandHandlers({
    getDb: async () => db,
    store: {
      getAssetPathForBlock: () => "",
    } as unknown as BackendStore,
  });
}

async function createBlock(db: AppDatabase) {
  const handler = createHandlers(db).find((definition) => definition.key === "blocksCreate");
  if (!handler || handler.key !== "blocksCreate") {
    throw new Error("blocksCreate handler not found");
  }

  return await handler.handle(undefined, {} as never);
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
  const handler = createHandlers(db).find((definition) => definition.key === "blocksList");
  if (!handler || handler.key !== "blocksList") {
    throw new Error("blocksList handler not found");
  }

  return await handler.handle(
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
  const handler = createHandlers(db).find((definition) => definition.key === "blocksLocate");
  if (!handler || handler.key !== "blocksLocate") {
    throw new Error("blocksLocate handler not found");
  }

  return await handler.handle(
    {
      blockId: request.blockId,
      tagIds: request.tagIds,
      visibility: request.visibility ?? "active",
    },
    {} as never,
  );
}

describe("blocks ipc handlers", () => {
  let client: DatabaseClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
  });

  function getDb(): AppDatabase {
    client = createTestDatabaseClient();
    return client.db;
  }

  it("lists active blocks from oldest to newest so new blocks render at the bottom", async () => {
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
    const firstBlock = await createBlock(db);
    await createBlock(db);
    const thirdBlock = await createBlock(db);
    const now = new Date().toISOString();

    db.insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    db.insert(blockTags)
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
    const db = getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    const now = new Date().toISOString();

    db.insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    db.insert(blockTags)
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
    const db = getDb();
    const activeBlock = await createBlock(db);
    const archivedBlock = await createBlock(db);

    db.run(
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
    const db = getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    const now = new Date().toISOString();

    db.insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    db.insert(blockTags)
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
    const db = getDb();
    const activeBlock = await createBlock(db);
    const archivedBlockA = await createBlock(db);
    const archivedBlockB = await createBlock(db);

    db.run(
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
    const db = getDb();
    const now = new Date().toISOString();
    const createdBlocks = [];
    for (let index = 0; index < 4; index += 1) {
      createdBlocks.push(await createBlock(db));
    }

    db.insert(tags).values({ createdAt: now, id: "tag-a", name: "A", updatedAt: now }).run();
    db.insert(blockTags)
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
});
