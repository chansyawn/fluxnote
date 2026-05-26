import type { AppDatabase } from "@main/core/database";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createEntrypointService } from "./service";

const mocks = vi.hoisted(() => ({
  createBlockRecord: vi.fn(),
  setBlockTagsByName: vi.fn(),
}));

const block = {
  archivedAt: null,
  content: "hello",
  contentUpdatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "block-1",
  isKept: false,
  isPinned: false,
  orderIndex: 0,
  tags: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
  willArchive: false,
};
const externalEditTrigger = {
  cwd: "/workspace",
  requestedFilePath: "note.md",
  source: "cli" as const,
  targetFilePath: "/workspace/note.md",
};

vi.mock("../blocks/service", () => ({
  createBlockRecord: mocks.createBlockRecord,
}));

vi.mock("../tags/service", () => ({
  setBlockTagsByName: mocks.setBlockTagsByName,
}));

function createService() {
  const db = {} as AppDatabase;
  const telemetryService = {
    captureEvent: vi.fn(),
  };
  return {
    db,
    service: createEntrypointService({
      createExternalEditSession: vi.fn(async () => ({
        blockId: "block-1",
        content: "updated",
        status: "submitted" as const,
      })),
      getDb: vi.fn(async () => db),
      requestOpenBlock: vi.fn(),
      showMainWindow: vi.fn(),
      telemetryService,
    }),
    telemetryService,
  };
}

describe("entrypoint service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBlockRecord.mockResolvedValue(block);
  });

  it("creates a block from text and requests open", async () => {
    const { service, telemetryService } = createService();

    const result = await service.createBlockFromText({
      blockCreatedSource: "cli_add_text",
      content: "hello",
    });

    expect(result).toEqual({ blockId: "block-1" });
    expect(telemetryService.captureEvent).toHaveBeenCalledWith("block_created", {
      source: "cli_add_text",
    });
    expect(mocks.createBlockRecord).toHaveBeenCalledWith(expect.any(Object), "hello");
  });

  it("applies tags before opening created block", async () => {
    const { db, service } = createService();

    await service.createBlockFromText({
      blockCreatedSource: "cli_add_file",
      content: "hello",
      tagNames: ["work", "idea"],
    });

    expect(mocks.setBlockTagsByName).toHaveBeenCalledWith(db, "block-1", ["work", "idea"]);
  });

  it("creates external edit session for created block", async () => {
    const createExternalEditSession = vi.fn(async () => ({
      blockId: "block-1",
      content: "updated",
      status: "submitted" as const,
    }));
    const requestOpenBlock = vi.fn();
    const telemetryService = {
      captureEvent: vi.fn(),
    };
    const service = createEntrypointService({
      createExternalEditSession,
      getDb: vi.fn(async () => ({}) as AppDatabase),
      requestOpenBlock,
      showMainWindow: vi.fn(),
      telemetryService,
    });
    const abortController = new AbortController();

    const result = await service.createExternalEdit(
      { content: "hello", tagNames: ["work"], trigger: externalEditTrigger },
      abortController.signal,
    );

    expect(result).toEqual({ blockId: "block-1", content: "updated", status: "submitted" });
    expect(telemetryService.captureEvent).toHaveBeenCalledWith("block_created", {
      source: "cli_external_edit",
    });
    expect(createExternalEditSession).toHaveBeenCalledWith(
      "block-1",
      "hello",
      externalEditTrigger,
      abortController.signal,
    );
    expect(requestOpenBlock).toHaveBeenCalledWith("block-1");
  });
});
