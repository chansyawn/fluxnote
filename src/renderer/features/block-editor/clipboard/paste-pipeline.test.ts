import { encodeBlockEditorClipboardHtml } from "@shared/features/block-editor/clipboard";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { handleBlockEditorPaste } from "./paste-pipeline";

const mocks = vi.hoisted(() => ({
  insertClipboardPayloadAtSelection: vi.fn(),
  insertMarkdownTablesAtSelection: vi.fn(),
  insertRichTextDataAtSelection: vi.fn(),
}));

vi.mock("./clipboard-insert", () => ({
  insertClipboardPayloadAtSelection: mocks.insertClipboardPayloadAtSelection,
  insertRichTextDataAtSelection: mocks.insertRichTextDataAtSelection,
}));

vi.mock("../syntax/table", () => ({
  insertMarkdownTablesAtSelection: mocks.insertMarkdownTablesAtSelection,
}));

const payload = {
  nodes: [{ text: "Text", type: "text", version: 1 }],
  sourceBlockId: "block-1",
};

function createPasteEvent(values: Record<string, string>): ClipboardEvent {
  return {
    clipboardData: {
      files: [],
      getData: (type: string) => values[type] ?? "",
      types: Object.keys(values),
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as ClipboardEvent;
}

describe("block editor paste pipeline", () => {
  beforeEach(() => {
    mocks.insertClipboardPayloadAtSelection.mockReset();
    mocks.insertMarkdownTablesAtSelection.mockReset();
    mocks.insertRichTextDataAtSelection.mockReset();
  });

  it("inserts internal html metadata payloads directly", () => {
    const event = createPasteEvent({
      "text/html": encodeBlockEditorClipboardHtml("<p>Text</p>", payload),
      "text/plain": "Text",
    });

    expect(handleBlockEditorPaste({} as never, "block-2", event, null)).toBe(true);

    expect(mocks.insertClipboardPayloadAtSelection).toHaveBeenCalledWith(
      {},
      "block-2",
      payload,
      null,
    );
    expect(mocks.insertRichTextDataAtSelection).not.toHaveBeenCalled();
  });

  it("inserts ordinary html from the paste event without reading the system clipboard", () => {
    const event = createPasteEvent({
      "text/html": "<p>External</p>",
      "text/plain": "External",
    });

    expect(handleBlockEditorPaste({} as never, "block-2", event, null)).toBe(true);

    expect(mocks.insertClipboardPayloadAtSelection).not.toHaveBeenCalled();
    expect(mocks.insertRichTextDataAtSelection).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ getData: expect.any(Function) }),
      null,
    );
    const [, snapshot] = mocks.insertRichTextDataAtSelection.mock.calls[0] as [
      unknown,
      { getData(type: string): string },
      unknown,
    ];
    expect(snapshot.getData("text/html")).toBe("<p>External</p>");
  });

  it("tries markdown table insertion before ordinary rich text insertion", () => {
    mocks.insertMarkdownTablesAtSelection.mockReturnValue(true);
    const event = createPasteEvent({
      "text/plain": ["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
    });

    expect(handleBlockEditorPaste({} as never, "block-2", event, null)).toBe(true);

    expect(mocks.insertMarkdownTablesAtSelection).toHaveBeenCalledWith(
      {},
      ["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
      null,
    );
    expect(mocks.insertRichTextDataAtSelection).not.toHaveBeenCalled();
  });
});
