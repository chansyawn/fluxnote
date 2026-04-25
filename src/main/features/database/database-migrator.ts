import path from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app } from "electron";

import type { AppDatabase } from "./database-client";

const MIGRATIONS_DIR_NAME = "drizzle";
const SOURCE_MIGRATIONS_DIR = "src/main/features/database/drizzle";

export function resolveMigrationsFolder(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, MIGRATIONS_DIR_NAME)
    : path.resolve(process.cwd(), SOURCE_MIGRATIONS_DIR);
}

export function migrateDatabase(db: AppDatabase): void {
  migrate(db, { migrationsFolder: resolveMigrationsFolder() });
}
