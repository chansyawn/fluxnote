import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDatabase } from "../core/database";
import { createEntrypointRuntime } from "./entrypoints";

const mocks = vi.hoisted(() => ({
  cliClose: vi.fn(async () => undefined),
  cliStart: vi.fn(async () => undefined),
  createBlockRecord: vi.fn(),
  deepLinkHandle: vi.fn(async () => ({ ok: true, data: null })),
  setBlockTagsByName: vi.fn(),
}));

const block = {
  archivedAt: null,
  content: "hello",
  contentUpdatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "block-1",
  isKept: false,
  tags: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
  willArchive: false,
};

vi.mock("../features/blocks/service", () => ({
  createBlockRecord: mocks.createBlockRecord,
}));

vi.mock("../features/tags/service", () => ({
  setBlockTagsByName: mocks.setBlockTagsByName,
}));

vi.mock("../features/deep-link/handler", () => ({
  createDeepLinkHandler: vi.fn(() => ({ handle: mocks.deepLinkHandle })),
}));

vi.mock("../features/cli/ipc-server", () => ({
  createCliIpcServer: vi.fn(() => ({ close: mocks.cliClose, start: mocks.cliStart })),
}));

describe("createEntrypointRuntime", () => {
  const getDb = vi.fn(async () => ({}) as AppDatabase) as () => Promise<AppDatabase>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches app.open command", async () => {
    const showMainWindow = vi.fn();
    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb,
      requestOpenBlock: vi.fn(),
      showMainWindow,
    });

    const result = await runtime.dispatchCommand("app.open", null);

    expect(result).toEqual({ data: null, ok: true });
    expect(showMainWindow).toHaveBeenCalledTimes(1);
  });

  it("creates block from text and requests open", async () => {
    mocks.createBlockRecord.mockResolvedValue(block);
    const requestOpenBlock = vi.fn();

    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb,
      requestOpenBlock,
      showMainWindow: vi.fn(),
    });

    const result = await runtime.dispatchCommand("block.create-from-text", { content: "hello" });

    expect(result).toEqual({ data: { blockId: "block-1" }, ok: true });
    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });

  it("creates block from text with tags and requests open", async () => {
    mocks.createBlockRecord.mockResolvedValue(block);
    mocks.setBlockTagsByName.mockResolvedValue(block);
    const requestOpenBlock = vi.fn();
    const db = {} as AppDatabase;
    const getTaggedDb = vi.fn(async () => db) as () => Promise<AppDatabase>;

    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb: getTaggedDb,
      requestOpenBlock,
      showMainWindow: vi.fn(),
    });

    const result = await runtime.dispatchCommand("block.create-from-text", {
      content: "hello",
      tagNames: ["work", "idea"],
    });

    expect(result).toEqual({ data: { blockId: "block-1" }, ok: true });
    expect(mocks.setBlockTagsByName).toHaveBeenCalledWith(db, "block-1", ["work", "idea"]);
    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });

  it("creates external edit block with tags and starts edit session", async () => {
    mocks.createBlockRecord.mockResolvedValue(block);
    mocks.setBlockTagsByName.mockResolvedValue(block);
    const createExternalEditSession = vi.fn(async () => ({
      blockId: "block-1",
      content: "updated",
      status: "submitted" as const,
    }));
    const db = {} as AppDatabase;
    const getTaggedDb = vi.fn(async () => db) as () => Promise<AppDatabase>;

    const runtime = createEntrypointRuntime({
      createExternalEditSession,
      getDb: getTaggedDb,
      requestOpenBlock: vi.fn(),
      showMainWindow: vi.fn(),
    });

    const result = await runtime.dispatchCommand("block.create-external-edit", {
      content: "hello",
      tagNames: ["work"],
    });

    expect(result).toEqual({
      data: { blockId: "block-1", content: "updated", status: "submitted" },
      ok: true,
    });
    expect(mocks.setBlockTagsByName).toHaveBeenCalledWith(db, "block-1", ["work"]);
    expect(createExternalEditSession).toHaveBeenCalledWith("block-1", "hello", undefined);
  });

  it("returns business error when payload is invalid", async () => {
    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb,
      requestOpenBlock: vi.fn(),
      showMainWindow: vi.fn(),
    });

    const result = await runtime.dispatchCommand("block.open", {});

    expect(result).toMatchObject({ error: { code: "BUSINESS.INVALID_INVOKE" }, ok: false });
  });

  it("starts and stops cli ipc server", async () => {
    const runtime = createEntrypointRuntime({
      createExternalEditSession: vi.fn(),
      getDb,
      requestOpenBlock: vi.fn(),
      showMainWindow: vi.fn(),
    });

    await runtime.startCliServer();
    await runtime.stopCliServer();

    expect(mocks.cliStart).toHaveBeenCalledTimes(1);
    expect(mocks.cliClose).toHaveBeenCalledTimes(1);
  });
});
