import {
  createDatabaseClient,
  type AppDatabase,
  type DatabaseClient,
} from "@main/core/database/database-client";
import { migrateDatabase } from "@main/core/database/database-migrator";
import { createBlockRecord, getPublicBlockById } from "@main/features/blocks/service";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createExternalEditManager } from "./manager";
import { createExternalEditService } from "./service";

async function createTestDatabaseClient(): Promise<DatabaseClient> {
  const client = createDatabaseClient(":memory:");
  await migrateDatabase(client.db);
  return client;
}

describe("external edit service", () => {
  let client: DatabaseClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
  });

  async function getDb(): Promise<AppDatabase> {
    client = await createTestDatabaseClient();
    return client.db;
  }

  it("keeps block when canceling external edit", async () => {
    const db = await getDb();
    const block = await createBlockRecord(db, "draft");
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const service = createExternalEditService({ manager });
    const pending = manager.begin(block.id, block.content);

    await service.cancelEdit(pending.session.editId);

    await expect(getPublicBlockById(db, block.id)).resolves.toMatchObject({
      id: block.id,
      content: "draft",
    });
    await expect(pending.result).resolves.toEqual({
      blockId: block.id,
      status: "cancelled",
    });
  });
});
