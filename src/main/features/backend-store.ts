import path from "node:path";

import { app } from "electron";

const BetterSqlite3 = require("better-sqlite3") as {
  new (filename: string): {
    close: () => void;
    exec: (sql: string) => void;
    pragma: (sql: string) => unknown;
    prepare: <TRow = Record<string, unknown>>(
      sql: string,
    ) => {
      all: (...params: unknown[]) => TRow[];
      get: (...params: unknown[]) => TRow | undefined;
      run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
    };
    transaction: <TResult>(fn: () => TResult) => () => TResult;
  };
};

interface Migration {
  id: number;
  sql: string;
}

const DATABASE_FILE_NAME = "fluxnote.sqlite3";
const ASSETS_DIR_NAME = "assets";

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS app_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        position INTEGER NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS block_tags (
        block_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (block_id, tag_id),
        FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_blocks_archived_at ON blocks(archived_at);
      CREATE INDEX IF NOT EXISTS idx_blocks_position ON blocks(position DESC);
      CREATE INDEX IF NOT EXISTS idx_block_tags_tag_id ON block_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_block_tags_block_id ON block_tags(block_id);
    `,
  },
];

export interface SqliteDatabase {
  close: () => void;
  exec: (sql: string) => void;
  pragma: (sql: string) => unknown;
  prepare: <TRow = Record<string, unknown>>(
    sql: string,
  ) => {
    all: (...params: unknown[]) => TRow[];
    get: (...params: unknown[]) => TRow | undefined;
    run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
  };
  transaction: <TResult>(fn: () => TResult) => () => TResult;
}

export class BackendStore {
  private db: SqliteDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const dbPath = this.getDatabasePath();
    const db = new BetterSqlite3(dbPath) as SqliteDatabase;
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    this.applyMigrations(db);
    this.db = db;
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    this.db.close();
    this.db = null;
    this.initialized = false;
  }

  getDb(): SqliteDatabase {
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

  private applyMigrations(db: SqliteDatabase): void {
    db.exec(
      `
      CREATE TABLE IF NOT EXISTS app_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `,
    );

    const appliedRows = db.prepare<{ id: number }>("SELECT id FROM app_migrations").all();
    const appliedIds = new Set(appliedRows.map((row) => row.id));

    for (const migration of MIGRATIONS) {
      if (appliedIds.has(migration.id)) {
        continue;
      }

      const apply = db.transaction(() => {
        db.exec(migration.sql);
        db.prepare("INSERT INTO app_migrations (id, applied_at) VALUES (?, ?)").run(
          migration.id,
          new Date().toISOString(),
        );
      });
      apply();
    }
  }
}
