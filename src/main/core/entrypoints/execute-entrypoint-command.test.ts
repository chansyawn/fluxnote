import type { AppDatabase } from "@main/core/database/database-client";
import { createBlockRecord } from "@main/features/blocks/service";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createEntrypointCommandExecutor } from "./execute-entrypoint-command";

vi.mock("@main/features/blocks/service", () => ({
  createBlockRecord: vi.fn(),
}));

const createBlockRecordMock = vi.mocked(createBlockRecord);

describe("entrypoint command executor", () => {
  const db = {} as AppDatabase;
  const createExternalEditSession = vi.fn();
  const getDb = vi.fn(async () => db);
  const requestOpenBlock = vi.fn();
  const showMainWindow = vi.fn();

  beforeEach(() => {
    createExternalEditSession.mockReset();
    getDb.mockClear();
    requestOpenBlock.mockClear();
    showMainWindow.mockClear();
    createBlockRecordMock.mockReset();
  });

  it("opens the main window", async () => {
    const executor = createEntrypointCommandExecutor({
      getDb,
      createExternalEditSession,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(executor.execute("app.open", null)).resolves.toBeNull();

    expect(showMainWindow).toHaveBeenCalledTimes(1);
  });

  it("creates a text block and requests it to open", async () => {
    createBlockRecordMock.mockResolvedValue({
      archivedAt: null,
      content: "hello",
      contentUpdatedAt: "now",
      createdAt: "now",
      id: "block-1",
      tags: [],
      updatedAt: "now",
      willArchive: false,
    });
    const executor = createEntrypointCommandExecutor({
      getDb,
      createExternalEditSession,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(executor.execute("block.create-from-text", { content: "hello" })).resolves.toEqual(
      {
        blockId: "block-1",
      },
    );

    expect(createBlockRecordMock).toHaveBeenCalledWith(db, "hello");
    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });

  it("creates a file-backed block and waits for external edit completion", async () => {
    createBlockRecordMock.mockResolvedValue({
      archivedAt: null,
      content: "draft",
      contentUpdatedAt: "now",
      createdAt: "now",
      id: "block-1",
      tags: [],
      updatedAt: "now",
      willArchive: false,
    });
    createExternalEditSession.mockResolvedValue({
      blockId: "block-1",
      content: "submitted",
      status: "submitted",
    });
    const executor = createEntrypointCommandExecutor({
      createExternalEditSession,
      getDb,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(
      executor.execute("block.create-external-edit", { content: "draft" }),
    ).resolves.toEqual({
      blockId: "block-1",
      content: "submitted",
      status: "submitted",
    });

    expect(createBlockRecordMock).toHaveBeenCalledWith(db, "draft");
    expect(createExternalEditSession).toHaveBeenCalledWith("block-1", "draft", undefined);
    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });

  it("requests an existing block to open", async () => {
    const executor = createEntrypointCommandExecutor({
      createExternalEditSession,
      getDb,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(executor.execute("block.open", { blockId: "block-1" })).resolves.toBeNull();

    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });
});
