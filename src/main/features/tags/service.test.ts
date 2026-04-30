import {
  createDatabaseClient,
  type AppDatabase,
  type DatabaseClient,
} from "@main/core/database/database-client";
import { migrateDatabase } from "@main/core/database/database-migrator";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { createBlockRecord } from "../blocks/service";
import { createTag, setBlockTags } from "./service";

async function createTestDatabaseClient(): Promise<DatabaseClient> {
  const client = createDatabaseClient(":memory:");
  await migrateDatabase(client.db);
  return client;
}

describe("tags service", () => {
  let client: DatabaseClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
  });

  async function getDb(): Promise<AppDatabase> {
    client = await createTestDatabaseClient();
    return client.db;
  }

  it("clears block tags when tagIds is empty", async () => {
    const db = await getDb();
    const block = await createBlockRecord(db);
    const tag = await createTag(db, "Feature");

    const updatedWithTag = await setBlockTags(db, block.id, [tag.id]);
    expect(updatedWithTag.tags.map((item) => item.id)).toEqual([tag.id]);

    await expect(setBlockTags(db, block.id, [])).resolves.toMatchObject({
      id: block.id,
      tags: [],
    });
  });
});
