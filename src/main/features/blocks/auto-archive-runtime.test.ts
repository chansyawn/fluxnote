import { createDatabaseClient, type DatabaseClient } from "@main/core/database/database-client";
import { migrateDatabase } from "@main/core/database/database-migrator";
import { blocks } from "@main/core/database/database-schema";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AutoArchiveRuntime, deriveScanIntervalSeconds } from "./auto-archive-runtime";

async function createTestDatabaseClient(): Promise<DatabaseClient> {
  const client = createDatabaseClient(":memory:");
  await migrateDatabase(client.db);
  return client;
}

describe("deriveScanIntervalSeconds", () => {
  it("enforces the minimum interval for short idle durations", () => {
    expect(deriveScanIntervalSeconds(1)).toBe(30);
    expect(deriveScanIntervalSeconds(5)).toBe(30);
  });

  it("derives proportional intervals within bounds", () => {
    expect(deriveScanIntervalSeconds(30)).toBe(180);
    expect(deriveScanIntervalSeconds(90)).toBe(540);
  });

  it("enforces the maximum interval for long idle durations", () => {
    expect(deriveScanIntervalSeconds(10080)).toBe(900);
  });
});

describe("AutoArchiveRuntime", () => {
  let client: DatabaseClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
  });

  it("emits when candidate ids change even if the pending count stays unchanged", async () => {
    client = await createTestDatabaseClient();
    const db = client.db;
    const oldIso = new Date(Date.now() - 120 * 60_000).toISOString();
    const freshIso = new Date(Date.now() - 30 * 60_000).toISOString();
    await db
      .insert(blocks)
      .values([
        {
          contentUpdatedAt: oldIso,
          id: "block-a",
        },
        {
          contentUpdatedAt: freshIso,
          id: "block-b",
        },
      ])
      .run();

    const emitEvent = vi.fn(() => true);
    const runtime = new AutoArchiveRuntime({
      emitEvent,
      getWindowVisible: () => true,
      readAutoArchiveSettings: () => ({
        enabled: true,
        idleMinutes: 60,
      }),
      store: {
        getDb: () => db,
      } as unknown as BackendStore,
    });

    await runtime.start();
    await db.run(sql`UPDATE blocks SET content_updated_at = ${freshIso} WHERE id = 'block-a'`);
    await db.run(sql`UPDATE blocks SET content_updated_at = ${oldIso} WHERE id = 'block-b'`);
    await runtime.trigger(false);
    runtime.stop();

    expect(emitEvent).toHaveBeenCalledTimes(2);
    expect(emitEvent).toHaveBeenNthCalledWith(1, "blocks.autoArchiveStateChanged", {
      archivedCount: 0,
      pendingCount: 1,
      windowVisible: true,
    });
    expect(emitEvent).toHaveBeenNthCalledWith(2, "blocks.autoArchiveStateChanged", {
      archivedCount: 0,
      pendingCount: 1,
      windowVisible: true,
    });
  });
});
