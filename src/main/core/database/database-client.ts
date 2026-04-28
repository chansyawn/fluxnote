import { DatabaseSync } from "node:sqlite";

import { drizzle, type RemoteCallback, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

import * as schema from "./database-schema";

export type AppDatabase = SqliteRemoteDatabase<typeof schema>;

export interface DatabaseClient {
  close: () => void;
  db: AppDatabase;
}

export function createDatabaseClient(databasePath: string): DatabaseClient {
  const sqlite = new DatabaseSync(databasePath);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA busy_timeout = 5000");
  const executeSqlite = (async (
    query: Parameters<RemoteCallback>[0],
    params: Parameters<RemoteCallback>[1],
    method: Parameters<RemoteCallback>[2],
  ) => {
    const statement = sqlite.prepare(query);
    if (method === "run") {
      const result = statement.run(...params);
      return { changes: result.changes, rows: [] };
    }
    statement.setReturnArrays(true);
    if (method === "get") {
      return { rows: (statement.get(...params) as unknown[] | undefined) ?? undefined };
    }
    if (method === "values") {
      return { rows: statement.all(...params) as unknown as unknown[][] };
    }
    return { rows: statement.all(...params) as unknown as unknown[][] };
  }) as RemoteCallback;
  const db = drizzle(executeSqlite, { schema });

  return {
    close: () => {
      sqlite.close();
    },
    db,
  };
}
