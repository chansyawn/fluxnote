import { describe, expect, it, vi } from "vitest";

import type { AppDatabase, DatabaseClient } from "./client";
import { createDbRuntime } from "./runtime";

describe("createDbRuntime", () => {
  it("throws when getDb is called before init", () => {
    const runtime = createDbRuntime({
      createDatabaseClient: vi.fn() as unknown as (databasePath: string) => DatabaseClient,
      databasePath: "/tmp/test.db",
      migrateDatabase: vi.fn(),
    });

    expect(() => runtime.getDb()).toThrowError("Database is not initialized");
  });

  it("initializes once for concurrent init calls", async () => {
    const db = { marker: "db" } as unknown as AppDatabase;
    const close = vi.fn();
    const createDatabaseClient = vi.fn(
      () => ({ db, close }) satisfies DatabaseClient,
    ) as unknown as (databasePath: string) => DatabaseClient;
    const migrateDatabase = vi.fn(async () => undefined);
    const runtime = createDbRuntime({
      createDatabaseClient,
      databasePath: "/tmp/test.db",
      migrateDatabase,
    });

    await Promise.all([runtime.init(), runtime.init()]);

    expect(createDatabaseClient).toHaveBeenCalledTimes(1);
    expect(migrateDatabase).toHaveBeenCalledTimes(1);
    expect(runtime.getDb()).toBe(db);
  });

  it("closes created client when migration fails", async () => {
    const close = vi.fn();
    const createDatabaseClient = vi.fn(
      () => ({ db: {} as AppDatabase, close }) satisfies DatabaseClient,
    ) as unknown as (databasePath: string) => DatabaseClient;
    const migrateDatabase = vi.fn(async () => {
      throw new Error("migration failed");
    });
    const runtime = createDbRuntime({
      createDatabaseClient,
      databasePath: "/tmp/test.db",
      migrateDatabase,
    });

    await expect(runtime.init()).rejects.toThrowError("migration failed");
    expect(close).toHaveBeenCalledTimes(1);
    expect(() => runtime.getDb()).toThrowError("Database is not initialized");
  });

  it("close is idempotent and resets initialized state", async () => {
    const db = { marker: "db" } as unknown as AppDatabase;
    const close = vi.fn();
    const createDatabaseClient = vi.fn(
      () => ({ db, close }) satisfies DatabaseClient,
    ) as unknown as (databasePath: string) => DatabaseClient;
    const migrateDatabase = vi.fn(async () => undefined);
    const runtime = createDbRuntime({
      createDatabaseClient,
      databasePath: "/tmp/test.db",
      migrateDatabase,
    });

    await runtime.init();
    await runtime.close();
    await runtime.close();

    expect(close).toHaveBeenCalledTimes(1);
    expect(() => runtime.getDb()).toThrowError("Database is not initialized");
  });
});
