import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

type MigrationExecutor = (migrationQueries: string[]) => Promise<void>;
type MigrateFn = (
  db: unknown,
  executor: MigrationExecutor,
  options: { migrationsFolder: string },
) => Promise<void>;

const mocks = vi.hoisted(() => ({
  app: {
    isPackaged: false,
  },
  migrate: vi.fn<MigrateFn>(),
}));

vi.mock("electron", () => ({ app: mocks.app }));
vi.mock("drizzle-orm/sqlite-proxy/migrator", () => ({ migrate: mocks.migrate }));

import type { AppDatabase } from "./client";
import { migrateDatabase, resolveMigrationsFolder } from "./migrator";

describe("database migrator", () => {
  beforeEach(() => {
    mocks.app.isPackaged = false;
    mocks.migrate.mockReset();
    mocks.migrate.mockResolvedValue(undefined);
    Object.defineProperty(process, "resourcesPath", {
      configurable: true,
      value: "/mock/resources",
      writable: true,
    });
  });

  it("resolves source migrations folder in development", () => {
    expect(resolveMigrationsFolder()).toBe(
      path.resolve(process.cwd(), "src/main/core/database/drizzle"),
    );
  });

  it("resolves resources migrations folder in packaged runtime", () => {
    mocks.app.isPackaged = true;

    expect(resolveMigrationsFolder()).toBe(path.join("/mock/resources", "drizzle"));
  });

  it("calls drizzle migrate with transaction executor", async () => {
    const run = vi.fn(async () => undefined);
    const transaction = vi.fn(async (cb: (tx: { run: typeof run }) => Promise<void>) => {
      await cb({ run });
    });
    const db = {
      transaction,
    } as unknown as AppDatabase;

    const fakeQueries = ["q1", "q2"];
    mocks.migrate.mockImplementationOnce(async (_db, executor) => {
      await executor(fakeQueries);
    });

    await migrateDatabase(db);

    expect(mocks.migrate).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenNthCalledWith(1, "q1");
    expect(run).toHaveBeenNthCalledWith(2, "q2");
  });
});
