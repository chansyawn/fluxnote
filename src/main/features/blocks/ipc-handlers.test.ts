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

async function listActiveBlocks(db: AppDatabase, tagIds?: string[]) {
  const handler = createHandlers(db).find((definition) => definition.key === "blocksList");
  if (!handler || handler.key !== "blocksList") {
    throw new Error("blocksList handler not found");
  }

  return await handler.handle({ tagIds, visibility: "active" }, {} as never);
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

    const listedBlocks = await listActiveBlocks(db);

    expect(listedBlocks.map((block) => block.id)).toEqual([
      firstBlock.id,
      secondBlock.id,
      thirdBlock.id,
    ]);
    expect(listedBlocks.map((block) => block.position)).toEqual([1, 2, 3]);
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

    const listedBlocks = await listActiveBlocks(db, ["tag-feature"]);

    expect(listedBlocks.map((block) => block.id)).toEqual([firstBlock.id, thirdBlock.id]);
  });
});
