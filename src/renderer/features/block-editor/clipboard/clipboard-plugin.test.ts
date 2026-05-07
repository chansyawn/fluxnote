import type { BlockEditorClipboardData } from "@shared/features/block-editor/clipboard";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BLOCK_EDITOR_CLIPBOARD_MIME } from "./clipboard-payload";
import { createClipboardDataSnapshot, writeBlockEditorClipboardData } from "./clipboard-plugin";

const clipboardData: BlockEditorClipboardData = {
  [BLOCK_EDITOR_CLIPBOARD_MIME]: JSON.stringify({
    assets: [],
    markdown: "Text",
    nodes: [],
    sourceBlockId: "block-1",
  }),
  "text/html": "<p>Text</p>",
  "text/plain": "Text",
};

function setWindowClipboard(write?: (data: BlockEditorClipboardData) => Promise<void>): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: write ? { clipboard: { write } } : {},
  });
}

function setNavigatorClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText } },
  });
}

function createMutableDataTransfer(values: Record<string, string>): DataTransfer {
  let currentValues = values;
  return {
    getData: (type: string) => currentValues[type] ?? "",
    items: [],
    files: [],
    types: Object.keys(values),
    clearData: () => {
      currentValues = {};
    },
  } as unknown as DataTransfer;
}

describe("block editor clipboard plugin", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "navigator");
    vi.restoreAllMocks();
  });

  it("writes block editor data through the preload clipboard bridge", async () => {
    const write = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    setWindowClipboard(write);
    setNavigatorClipboard(writeText);

    await writeBlockEditorClipboardData(clipboardData);

    expect(write).toHaveBeenCalledWith(clipboardData);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to plain text when the preload clipboard bridge is unavailable", async () => {
    const writeText = vi.fn(async () => undefined);
    setWindowClipboard();
    setNavigatorClipboard(writeText);

    await writeBlockEditorClipboardData(clipboardData);

    expect(writeText).toHaveBeenCalledWith("Text");
  });

  it("keeps paste data available after the original data transfer is cleared", () => {
    const dataTransfer = createMutableDataTransfer({
      "text/html": "<p>External</p>",
      "text/plain": "External",
    });

    const snapshot = createClipboardDataSnapshot(dataTransfer);
    dataTransfer.clearData();

    expect(snapshot.getData("text/html")).toBe("<p>External</p>");
    expect(snapshot.getData("text/plain")).toBe("External");
  });
});
