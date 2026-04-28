import path from "node:path";

import { app } from "electron";

import { createDatabaseClient, type AppDatabase } from "../database/database-client";
import { migrateDatabase } from "../database/database-migrator";

const DATABASE_FILE_NAME = "fluxnote.sqlite3";
const ASSETS_DIR_NAME = "assets";

export class BackendStore {
  private closeDb: (() => void) | null = null;
  private db: AppDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const dbPath = this.getDatabasePath();
    const client = createDatabaseClient(dbPath);
    await migrateDatabase(client.db);
    this.db = client.db;
    this.closeDb = client.close;
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (!this.closeDb) {
      return;
    }

    this.closeDb();
    this.closeDb = null;
    this.db = null;
    this.initialized = false;
  }

  getDb(): AppDatabase {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    return this.db;
  }

  getDatabasePath(): string {
    return path.join(app.getPath("userData"), DATABASE_FILE_NAME);
  }

  getAssetPathForBlock(blockId: string): string {
    return path.join(this.getAssetsRootPath(), blockId);
  }

  getAssetsRootPath(): string {
    return path.join(app.getPath("userData"), ASSETS_DIR_NAME);
  }
}
