import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./database-schema";

type BetterSqlite3Instance = import("better-sqlite3").Database;

const BetterSqlite3 = require("better-sqlite3") as {
  new (filename: string): BetterSqlite3Instance;
};

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseClient {
  close: () => void;
  db: AppDatabase;
}

export function createDatabaseClient(databasePath: string): DatabaseClient {
  const sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return {
    close: () => {
      sqlite.close();
    },
    db: drizzle(sqlite, { schema }),
  };
}
