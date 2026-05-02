import { APP_ASSETS_DIR_NAME, APP_DATABASE_FILE } from "@shared/app/app-config";
import { app } from "electron";

import {
  createDatabaseClient as defaultCreateDatabaseClient,
  type AppDatabase,
  type DatabaseClient,
} from "../database";
import { migrateDatabase as defaultMigrateDatabase } from "../database";
import { createDbRuntime } from "../database";
import { createPersistencePaths, type PersistencePaths } from "./paths";

interface CreatePersistenceRuntimeOptions {
  assetsDirName?: string;
  createDatabaseClient?: (databasePath: string) => DatabaseClient;
  databaseFileName?: string;
  getUserDataPath?: () => string;
  migrateDatabase?: (db: AppDatabase) => Promise<void>;
}

export interface PersistenceRuntime {
  close: () => Promise<void>;
  getDb: () => AppDatabase;
  init: () => Promise<void>;
  paths: PersistencePaths;
}

export function createPersistenceRuntime(
  options: CreatePersistenceRuntimeOptions = {},
): PersistenceRuntime {
  const getUserDataPath = options.getUserDataPath ?? (() => app.getPath("userData"));
  const paths = createPersistencePaths({
    assetsDirName: options.assetsDirName ?? APP_ASSETS_DIR_NAME,
    databaseFileName: options.databaseFileName ?? APP_DATABASE_FILE,
    getUserDataPath,
  });

  const dbRuntime = createDbRuntime({
    createDatabaseClient: options.createDatabaseClient ?? defaultCreateDatabaseClient,
    databasePath: paths.getDatabasePath(),
    migrateDatabase: options.migrateDatabase ?? defaultMigrateDatabase,
  });

  return {
    close: dbRuntime.close,
    getDb: dbRuntime.getDb,
    init: dbRuntime.init,
    paths,
  };
}
