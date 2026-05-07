import {
  encodeBlockEditorClipboardHtml,
  type BlockEditorClipboardWriteRequest,
} from "@shared/features/block-editor/clipboard";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createClipboardDataSnapshot, writeBlockEditorClipboardData } from "./clipboard-plugin";

vi.mock("@renderer/clients", () => ({
  writeBlockEditorClipboard: vi.fn(),
}));

import { writeBlockEditorClipboard } from "@renderer/clients";

const clipboardRequest: BlockEditorClipboardWriteRequest = {
  html: "<p>Text</p>",
  payload: {
    nodes: [],
    sourceBlockId: "block-1",
    version: 1,
  },
  text: "Text",
};

function setNavigatorClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText } },
  });
}

function createMutableDataTransfer(values: Record<string, string>): DataTransfer {
  let currentValues = values;
  return {
    clearData: () => {
      currentValues = {};
    },
    files: [],
    getData: (type: string) => currentValues[type] ?? "",
    items: [],
    types: Object.keys(values),
  } as unknown as DataTransfer;
}

describe("block editor clipboard plugin", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "navigator");
    vi.mocked(writeBlockEditorClipboard).mockReset();
    vi.restoreAllMocks();
  });

  it("writes block editor data through the renderer clipboard client", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.mocked(writeBlockEditorClipboard).mockResolvedValue(undefined);
    setNavigatorClipboard(writeText);

    await writeBlockEditorClipboardData(clipboardRequest);

    expect(writeBlockEditorClipboard).toHaveBeenCalledWith(clipboardRequest);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to plain text when the renderer clipboard client fails", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.mocked(writeBlockEditorClipboard).mockRejectedValue(new Error("unavailable"));
    setNavigatorClipboard(writeText);

    await writeBlockEditorClipboardData(clipboardRequest);

    expect(writeText).toHaveBeenCalledWith("Text");
  });

  it("keeps paste data available after the original data transfer is cleared", () => {
    const dataTransfer = createMutableDataTransfer({
      "text/html": encodeBlockEditorClipboardHtml("<p>External</p>", clipboardRequest.payload),
      "text/plain": "External",
    });

    const snapshot = createClipboardDataSnapshot(dataTransfer);
    dataTransfer.clearData();

    expect(snapshot.getData("text/html")).toBe("<p>External</p>");
    expect(snapshot.getData("text/plain")).toBe("External");
  });
});
