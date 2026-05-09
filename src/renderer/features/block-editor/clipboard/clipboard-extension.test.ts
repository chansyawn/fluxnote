import {
  encodeBlockEditorClipboardHtml,
  type BlockEditorClipboardWriteRequest,
} from "@shared/features/block-editor/clipboard";
import { describe, expect, it } from "vite-plus/test";

import { createClipboardDataSnapshot } from "./clipboard-extension";

const clipboardRequest: BlockEditorClipboardWriteRequest = {
  html: "<p>Text</p>",
  payload: {
    nodes: [],
    sourceBlockId: "block-1",
  },
  text: "Text",
};

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

describe("block editor clipboard extension", () => {
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
