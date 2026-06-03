import { existsSync } from "node:fs";
import path from "node:path";

import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import { app } from "electron";

import type { AppDatabase } from "./client";

const MIGRATIONS_DIR_NAME = "drizzle";
const SOURCE_MIGRATIONS_DIR = "src/main/core/database/drizzle";
const WORKSPACE_SOURCE_MIGRATIONS_DIR = "apps/desktop/src/main/core/database/drizzle";

function isPackagedElectronRuntime(): boolean {
  return Boolean(app?.isPackaged);
}

export function resolveMigrationsFolder(): string {
  if (isPackagedElectronRuntime()) {
    return path.join(process.resourcesPath, MIGRATIONS_DIR_NAME);
  }

  const candidates = [
    path.resolve(process.cwd(), SOURCE_MIGRATIONS_DIR),
    path.resolve(process.cwd(), WORKSPACE_SOURCE_MIGRATIONS_DIR),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
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
