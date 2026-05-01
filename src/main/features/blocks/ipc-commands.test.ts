import type { AppContext } from "@main/app-context";
import {
  createDatabaseClient,
  type DatabaseClient,
  type AppDatabase,
} from "@main/core/database/database-client";
import { migrateDatabase } from "@main/core/database/database-migrator";
import { blockTags, tags } from "@main/core/database/database-schema";
import type { BackendStore } from "@main/core/persistence/backend-store";
import type { Block, ListBlocksResult, LocateBlockResult } from "@shared/features/blocks";
import { DEFAULT_SETTINGS, type AutoArchiveSettings } from "@shared/features/preferences";
import type { CommandInput, CommandName, CommandOutput } from "@shared/ipc/types";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { registerBlocksCommands } from "./blocks-command";

async function createTestDatabaseClient(): Promise<DatabaseClient> {
  const client = createDatabaseClient(":memory:");
  await migrateDatabase(client.db);
  return client;
}

interface TestCommandOptions {
  now?: Date;
  protectedBlockIds?: Set<string>;
  settings?: AutoArchiveSettings;
}

type CommandHandler<T extends CommandName> = (
  input: CommandInput<T>,
  ctx: AppContext,
) => Promise<CommandOutput<T>> | CommandOutput<T>;

function createContext(db: AppDatabase, options: TestCommandOptions): AppContext {
  return {
    externalEditManager: {
      listSessions: () =>
        Array.from(options.protectedBlockIds ?? new Set()).map((blockId) => ({
          blockId,
          createdAt: new Date().toISOString(),
          editId: blockId,
        })),
    } as AppContext["externalEditManager"],
    events: {
      emit: () => true,
      isSenderTrusted: () => true,
      registerWindow: () => {},
    },
    getDb: async () => db,
    now: () => options.now ?? new Date(),
    openBlockService: {
      acknowledgePending: () => {},
      emitPending: () => true,
      readPending: () => ({ blockId: null }),
      requestOpen: () => true,
    },
    preferencesService: {
      patchSettings: () => DEFAULT_SETTINGS,
      readAutoArchiveSettings: () => options.settings ?? DEFAULT_SETTINGS.autoArchive,
      readSettings: () => DEFAULT_SETTINGS,
      resetSettings: () => DEFAULT_SETTINGS,
    },
    store: {
      getAssetPathForBlock: () => "",
    } as unknown as BackendStore,
    windowManager: {
      createMainWindow: () => {},
      getMainWindow: () => null,
      hideMainWindow: () => {},
      openMainWindowDevTools: () => {},
      prepareToQuit: () => {},
      requestQuit: () => {},
      showMainWindow: () => {},
      toggleMainWindow: () => {},
    },
  };
}

function createHandlers(db: AppDatabase, options: TestCommandOptions = {}) {
  const handlers = new Map<CommandName, CommandHandler<CommandName>>();
  registerBlocksCommands({
    command<T extends CommandName>(name: T, handler: CommandHandler<T>) {
      handlers.set(name, handler as CommandHandler<CommandName>);
    },
    register() {},
  } as never);

  return {
    ctx: createContext(db, options),
    handlers,
  };
}

async function createBlock(db: AppDatabase): Promise<Block> {
  const { handlers, ctx } = createHandlers(db);
  const command = handlers.get("blocks.create");
  if (!command) {
    throw new Error("blocks.create command not found");
  }

  return (await command(undefined, ctx)) as Block;
}

async function setBlockCreatedAt(db: AppDatabase, blockId: string, createdAt: string) {
  await db.run(sql`UPDATE blocks SET created_at = ${createdAt} WHERE id = ${blockId}`);
}

async function setBlockContentUpdatedAt(
  db: AppDatabase,
  blockId: string,
  contentUpdatedAt: string,
) {
  await db.run(
    sql`UPDATE blocks SET content_updated_at = ${contentUpdatedAt} WHERE id = ${blockId}`,
  );
}

async function listBlocks(
  db: AppDatabase,
  request: {
    tagIds?: string[];
    visibility?: "active" | "archived";
    offset?: number;
    limit?: number;
  } = {},
  options: TestCommandOptions = {},
): Promise<ListBlocksResult> {
  const { handlers, ctx } = createHandlers(db, options);
  const command = handlers.get("blocks.list");
  if (!command) {
    throw new Error("blocks.list command not found");
  }

  return (await command(
    {
      limit: request.limit ?? 50,
      offset: request.offset ?? 0,
      tagIds: request.tagIds,
      visibility: request.visibility ?? "active",
    },
    ctx,
  )) as ListBlocksResult;
}

async function locateBlock(
  db: AppDatabase,
  request: {
    blockId: string;
    tagIds?: string[];
    visibility?: "active" | "archived";
  },
  options: TestCommandOptions = {},
): Promise<LocateBlockResult> {
  const { handlers, ctx } = createHandlers(db, options);
  const command = handlers.get("blocks.locate");
  if (!command) {
    throw new Error("blocks.locate command not found");
  }

  return (await command(
    {
      blockId: request.blockId,
      tagIds: request.tagIds,
      visibility: request.visibility ?? "active",
    },
    ctx,
  )) as LocateBlockResult;
}

describe("blocks ipc commands", () => {
  let client: DatabaseClient | null = null;

  afterEach(() => {
    client?.close();
    client = null;
  });

  async function getDb(): Promise<AppDatabase> {
    client = await createTestDatabaseClient();
    return client.db;
  }

  it("lists active blocks from newest to oldest so new blocks render at the top", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    await setBlockCreatedAt(db, firstBlock.id, "2026-01-01T00:00:00.000Z");
    await setBlockCreatedAt(db, secondBlock.id, "2026-01-02T00:00:00.000Z");
    await setBlockCreatedAt(db, thirdBlock.id, "2026-01-03T00:00:00.000Z");

    const page = await listBlocks(db);

    expect(page.blocks.map((block) => block.id)).toEqual([
      thirdBlock.id,
      secondBlock.id,
      firstBlock.id,
    ]);
    expect(page.totalCount).toBe(3);
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(50);
  });

  it("returns later pages with the same total count", async () => {
    const db = await getDb();
    const createdBlocks = [];
    for (let index = 0; index < 5; index += 1) {
      createdBlocks.push(await createBlock(db));
      await setBlockCreatedAt(db, createdBlocks[index]!.id, `2026-01-0${index + 1}T00:00:00.000Z`);
    }

    const page = await listBlocks(db, { limit: 2, offset: 2 });

    expect(page.blocks.map((block) => block.id)).toEqual([
      createdBlocks[2]!.id,
      createdBlocks[1]!.id,
    ]);
    expect(page.totalCount).toBe(5);
    expect(page.offset).toBe(2);
    expect(page.limit).toBe(2);
  });

  it("keeps tag-filtered blocks from newest to oldest", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    await createBlock(db);
    const thirdBlock = await createBlock(db);
    await setBlockCreatedAt(db, firstBlock.id, "2026-01-01T00:00:00.000Z");
    await setBlockCreatedAt(db, thirdBlock.id, "2026-01-03T00:00:00.000Z");
    const now = new Date().toISOString();

    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    await db
      .insert(blockTags)
      .values([
        { blockId: firstBlock.id, tagId: "tag-feature" },
        { blockId: thirdBlock.id, tagId: "tag-feature" },
      ])
      .run();

    const page = await listBlocks(db, { tagIds: ["tag-feature"] });

    expect(page.blocks.map((block) => block.id)).toEqual([thirdBlock.id, firstBlock.id]);
    expect(page.totalCount).toBe(2);
  });

  it("paginates tag-filtered blocks with the correct total count", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    await setBlockCreatedAt(db, firstBlock.id, "2026-01-01T00:00:00.000Z");
    await setBlockCreatedAt(db, secondBlock.id, "2026-01-02T00:00:00.000Z");
    await setBlockCreatedAt(db, thirdBlock.id, "2026-01-03T00:00:00.000Z");
    const now = new Date().toISOString();

    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    await db
      .insert(blockTags)
      .values([
        { blockId: firstBlock.id, tagId: "tag-feature" },
        { blockId: secondBlock.id, tagId: "tag-feature" },
        { blockId: thirdBlock.id, tagId: "tag-feature" },
      ])
      .run();

    const page = await listBlocks(db, { tagIds: ["tag-feature"], limit: 1, offset: 1 });

    expect(page.blocks.map((block) => block.id)).toEqual([secondBlock.id]);
    expect(page.totalCount).toBe(3);
  });

  it("paginates active and archived blocks independently", async () => {
    const db = await getDb();
    const activeBlock = await createBlock(db);
    const archivedBlock = await createBlock(db);

    await db.run(
      sql`UPDATE blocks SET archived_at = ${new Date().toISOString()} WHERE id = ${archivedBlock.id}`,
    );

    const activePage = await listBlocks(db, { visibility: "active" });
    const archivedPage = await listBlocks(db, { visibility: "archived" });

    expect(activePage.blocks.map((block) => block.id)).toEqual([activeBlock.id]);
    expect(activePage.totalCount).toBe(1);
    expect(archivedPage.blocks.map((block) => block.id)).toEqual([archivedBlock.id]);
    expect(archivedPage.totalCount).toBe(1);
  });

  it("marks listed blocks that will be archived by the next auto-archive trigger", async () => {
    const db = await getDb();
    const staleBlock = await createBlock(db);
    const protectedBlock = await createBlock(db);
    const freshBlock = await createBlock(db);
    const options = {
      now: new Date("2026-01-01T12:00:00.000Z"),
      protectedBlockIds: new Set([protectedBlock.id]),
      settings: {
        enabled: true,
        idleMinutes: 60,
      },
    } satisfies TestCommandOptions;
    await setBlockContentUpdatedAt(db, staleBlock.id, "2026-01-01T10:00:00.000Z");
    await setBlockContentUpdatedAt(db, protectedBlock.id, "2026-01-01T10:00:00.000Z");
    await setBlockContentUpdatedAt(db, freshBlock.id, "2026-01-01T11:30:00.000Z");

    const page = await listBlocks(db, {}, options);
    const blocksById = new Map(page.blocks.map((block) => [block.id, block]));

    expect(blocksById.get(staleBlock.id)?.willArchive).toBe(true);
    expect(blocksById.get(protectedBlock.id)?.willArchive).toBe(false);
    expect(blocksById.get(freshBlock.id)?.willArchive).toBe(false);
  });

  it("marks located blocks with the same auto-archive evaluation", async () => {
    const db = await getDb();
    const staleBlock = await createBlock(db);
    await setBlockContentUpdatedAt(db, staleBlock.id, "2026-01-01T10:00:00.000Z");

    await expect(
      locateBlock(
        db,
        { blockId: staleBlock.id },
        {
          now: new Date("2026-01-01T12:00:00.000Z"),
          settings: {
            enabled: true,
            idleMinutes: 60,
          },
        },
      ),
    ).resolves.toMatchObject({
      block: {
        id: staleBlock.id,
        willArchive: true,
      },
    });
  });

  it("locates blocks by zero-based index with the current filters", async () => {
    const db = await getDb();
    const firstBlock = await createBlock(db);
    const secondBlock = await createBlock(db);
    const thirdBlock = await createBlock(db);
    await setBlockCreatedAt(db, firstBlock.id, "2026-01-01T00:00:00.000Z");
    await setBlockCreatedAt(db, secondBlock.id, "2026-01-02T00:00:00.000Z");
    await setBlockCreatedAt(db, thirdBlock.id, "2026-01-03T00:00:00.000Z");
    const now = new Date().toISOString();

    await db
      .insert(tags)
      .values({
        createdAt: now,
        id: "tag-feature",
        name: "Feature",
        updatedAt: now,
      })
      .run();
    await db
      .insert(blockTags)
      .values([
        { blockId: firstBlock.id, tagId: "tag-feature" },
        { blockId: thirdBlock.id, tagId: "tag-feature" },
      ])
      .run();

    await expect(locateBlock(db, { blockId: secondBlock.id })).resolves.toMatchObject({
      block: { id: secondBlock.id },
      index: 1,
    });
    await expect(
      locateBlock(db, { blockId: thirdBlock.id, tagIds: ["tag-feature"] }),
    ).resolves.toMatchObject({
      block: { id: thirdBlock.id },
      index: 0,
    });
    await expect(
      locateBlock(db, { blockId: secondBlock.id, tagIds: ["tag-feature"] }),
    ).resolves.toBeNull();
  });

  it("locates archived blocks when visibility is archived", async () => {
    const db = await getDb();
    const activeBlock = await createBlock(db);
    const archivedBlockA = await createBlock(db);
    const archivedBlockB = await createBlock(db);
    await setBlockCreatedAt(db, archivedBlockA.id, "2026-01-01T00:00:00.000Z");
    await setBlockCreatedAt(db, archivedBlockB.id, "2026-01-02T00:00:00.000Z");

    await db.run(
      sql`UPDATE blocks SET archived_at = ${new Date().toISOString()} WHERE id IN (${archivedBlockA.id}, ${archivedBlockB.id})`,
    );

    await expect(
      locateBlock(db, { blockId: archivedBlockB.id, visibility: "archived" }),
    ).resolves.toMatchObject({ block: { id: archivedBlockB.id }, index: 0 });

    await expect(
      locateBlock(db, { blockId: activeBlock.id, visibility: "archived" }),
    ).resolves.toBeNull();
  });

  it("returns the correct total count from tag-filtered pages", async () => {
    const db = await getDb();
    const now = new Date().toISOString();
    const createdBlocks = [];
    for (let index = 0; index < 4; index += 1) {
      createdBlocks.push(await createBlock(db));
    }

    await db.insert(tags).values({ createdAt: now, id: "tag-a", name: "A", updatedAt: now }).run();
    await db
      .insert(blockTags)
      .values([
        { blockId: createdBlocks[0].id, tagId: "tag-a" },
        { blockId: createdBlocks[1].id, tagId: "tag-a" },
        { blockId: createdBlocks[3].id, tagId: "tag-a" },
      ])
      .run();

    const page = await listBlocks(db, { tagIds: ["tag-a"], limit: 1, offset: 0 });
    expect(page.totalCount).toBe(3);
    expect(page.blocks).toHaveLength(1);
  });

  it("creates blocks concurrently and can locate every block", async () => {
    const db = await getDb();
    const created = await Promise.all(
      Array.from({ length: 10 }, async () => await createBlock(db)),
    );

    const page = await listBlocks(db);
    expect(page.blocks).toHaveLength(10);
    for (const block of created) {
      await expect(locateBlock(db, { blockId: block.id })).resolves.toMatchObject({
        block: { id: block.id },
      });
    }
  });
});
