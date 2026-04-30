import path from "node:path";

import { APP_ASSETS_DIR_NAME, APP_DATABASE_FILE } from "@shared/app/app-config";
import { app } from "electron";

import { createDatabaseClient, type AppDatabase } from "../database/database-client";
import { migrateDatabase } from "../database/database-migrator";

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
    return path.join(app.getPath("userData"), APP_DATABASE_FILE);
  }

  getAssetPathForBlock(blockId: string): string {
    return path.join(this.getAssetsRootPath(), blockId);
  }

  getAssetsRootPath(): string {
    return path.join(app.getPath("userData"), APP_ASSETS_DIR_NAME);
  }
}
