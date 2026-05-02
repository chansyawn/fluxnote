import type { AppDatabase, DatabaseClient } from "@main/core/database";

interface CreateDbRuntimeDependencies {
  createDatabaseClient: (databasePath: string) => DatabaseClient;
  databasePath: string;
  migrateDatabase: (db: AppDatabase) => Promise<void>;
}

export interface DbRuntime {
  close: () => Promise<void>;
  getDb: () => AppDatabase;
  init: () => Promise<void>;
}

export function createDbRuntime(deps: CreateDbRuntimeDependencies): DbRuntime {
  let closeDb: (() => void) | null = null;
  let db: AppDatabase | null = null;
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  async function init(): Promise<void> {
    if (initialized) {
      return;
    }
    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      const client = deps.createDatabaseClient(deps.databasePath);
      try {
        await deps.migrateDatabase(client.db);
        db = client.db;
        closeDb = client.close;
        initialized = true;
      } catch (error) {
        client.close();
        throw error;
      } finally {
        initPromise = null;
      }
    })();

    await initPromise;
  }

  async function close(): Promise<void> {
    if (initPromise) {
      await initPromise;
    }
    if (!closeDb) {
      return;
    }

    closeDb();
    closeDb = null;
    db = null;
    initialized = false;
  }

  function getDb(): AppDatabase {
    if (!db) {
      throw new Error("Database is not initialized");
    }

    return db;
  }

  return {
    close,
    getDb,
    init,
  };
}
