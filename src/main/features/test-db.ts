import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createDatabaseClient, migrateDatabase, type AppDatabase } from "@main/core/database";

export interface TestDbContext {
  db: AppDatabase;
  close: () => void;
  cleanup: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDbContext> {
  const dir = await mkdtemp(path.join(tmpdir(), "fluxnote-features-test-"));
  const databasePath = path.join(dir, "test.sqlite3");
  const client = createDatabaseClient(databasePath);
  await migrateDatabase(client.db);

  return {
    db: client.db,
    close: () => client.close(),
    cleanup: async () => {
      await rm(dir, { force: true, recursive: true });
    },
  };
}
