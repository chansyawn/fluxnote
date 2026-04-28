import path from "node:path";

import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import { app } from "electron";

import type { AppDatabase } from "./database-client";

const MIGRATIONS_DIR_NAME = "drizzle";
const SOURCE_MIGRATIONS_DIR = "src/main/core/database/drizzle";

export function resolveMigrationsFolder(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, MIGRATIONS_DIR_NAME)
    : path.resolve(process.cwd(), SOURCE_MIGRATIONS_DIR);
}

export async function migrateDatabase(db: AppDatabase): Promise<void> {
  await migrate(
    db,
    async (migrationQueries) => {
      await db.transaction(async (tx) => {
        for (const migrationQuery of migrationQueries) {
          await tx.run(migrationQuery);
        }
      });
    },
    { migrationsFolder: resolveMigrationsFolder() },
  );
}
