import { createBackendCommandDispatcher } from "@main/features/backend-commands";
import { createBlockRecord } from "@main/features/blocks/block-service";
import type { AppDatabase } from "@main/features/database/database-client";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@main/features/blocks/block-service", () => ({
  createBlockRecord: vi.fn(),
}));

const createBlockRecordMock = vi.mocked(createBlockRecord);

describe("backend command dispatcher", () => {
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
    const dispatcher = createBackendCommandDispatcher({
      getDb,
      createExternalEditSession,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(dispatcher.dispatch("app.open", null)).resolves.toBeNull();

    expect(showMainWindow).toHaveBeenCalledTimes(1);
  });

  it("creates a text block and requests it to open", async () => {
    createBlockRecordMock.mockReturnValue({
      archivedAt: null,
      content: "hello",
      createdAt: "now",
      id: "block-1",
      position: 1,
      tags: [],
      updatedAt: "now",
      willArchive: false,
    });
    const dispatcher = createBackendCommandDispatcher({
      getDb,
      createExternalEditSession,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(
      dispatcher.dispatch("block.createFromText", { content: "hello" }),
    ).resolves.toEqual({
      blockId: "block-1",
    });

    expect(createBlockRecordMock).toHaveBeenCalledWith(db, "hello");
    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });

  it("creates a file-backed block and waits for external edit completion", async () => {
    createBlockRecordMock.mockReturnValue({
      archivedAt: null,
      content: "draft",
      createdAt: "now",
      id: "block-1",
      position: 1,
      tags: [],
      updatedAt: "now",
      willArchive: false,
    });
    createExternalEditSession.mockResolvedValue({
      blockId: "block-1",
      content: "submitted",
      status: "submitted",
    });
    const dispatcher = createBackendCommandDispatcher({
      createExternalEditSession,
      getDb,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(
      dispatcher.dispatch("block.createExternalEdit", { content: "draft" }),
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
    const dispatcher = createBackendCommandDispatcher({
      createExternalEditSession,
      getDb,
      requestOpenBlock,
      showMainWindow,
    });

    await expect(dispatcher.dispatch("block.open", { blockId: "block-1" })).resolves.toBeNull();

    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });
});
