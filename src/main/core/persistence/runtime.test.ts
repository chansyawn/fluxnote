import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appGetPath: vi.fn(() => "/electron-user-data"),
  createDatabaseClient: vi.fn(),
  migrateDatabase: vi.fn(async () => undefined),
}));

vi.mock("electron", () => ({
  app: {
    getPath: mocks.appGetPath,
  },
}));

vi.mock("../database", async () => {
  const actual = await vi.importActual<typeof import("../database")>("../database");
  return {
    ...actual,
    createDatabaseClient: mocks.createDatabaseClient,
    migrateDatabase: mocks.migrateDatabase,
  };
});

import { createPersistenceRuntime } from "./runtime";

describe("createPersistenceRuntime", () => {
  beforeEach(() => {
    mocks.createDatabaseClient.mockReset();
    mocks.migrateDatabase.mockClear();
  });

  it("uses default app userData path", () => {
    const runtime = createPersistenceRuntime();

    expect(runtime.paths.getDatabasePath()).toContain("/electron-user-data");
    expect(runtime.paths.getAssetsRootPath()).toContain("/electron-user-data");
  });

  it("initializes and proxies db runtime", async () => {
    const db = { marker: "db" } as const;
    const close = vi.fn();
    mocks.createDatabaseClient.mockReturnValue({ db, close });

    const runtime = createPersistenceRuntime({
      assetsDirName: "assets-test",
      databaseFileName: "test.db",
      getUserDataPath: () => "/custom-user",
    });

    await runtime.init();

    expect(runtime.getDb()).toBe(db);
    expect(mocks.createDatabaseClient).toHaveBeenCalledWith("/custom-user/test.db");

    await runtime.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
