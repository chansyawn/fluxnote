import {
  encodeBlockEditorClipboardHtml,
  type BlockEditorClipboardPayload,
} from "@shared/features/block-editor/clipboard";
import type { LexicalEditor, PasteCommandType } from "lexical";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  insertClipboardPayloadAtSelection: vi.fn(),
  insertImageFilesAtSelection: vi.fn(),
  insertMarkdownTablesAtSelection: vi.fn(),
  insertRichTextDataAtSelection: vi.fn(),
}));

vi.mock("../assets/image-insert", () => ({
  insertImageFilesAtSelection: mocks.insertImageFilesAtSelection,
}));

vi.mock("../syntax/table", () => ({
  insertMarkdownTablesAtSelection: mocks.insertMarkdownTablesAtSelection,
}));

vi.mock("./clipboard-insert", () => ({
  insertClipboardPayloadAtSelection: mocks.insertClipboardPayloadAtSelection,
  insertRichTextDataAtSelection: mocks.insertRichTextDataAtSelection,
}));

import { createClipboardDataSnapshot, handleBlockEditorPaste } from "./clipboard-paste";

interface TestFile {
  name: string;
  type: string;
}

interface TestPasteEvent {
  event: PasteCommandType;
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
}

class TestDataTransfer {
  private readonly data: Map<string, string>;
  readonly files: TestFile[];
  readonly items = [];
  readonly types: string[];

  constructor(data: Map<string, string>, files: TestFile[] = []) {
    this.data = data;
    this.files = files;
    this.types = Array.from(data.keys());
  }

  getData(type: string): string {
    return this.data.get(type) ?? "";
  }

  setData(): void {}

  clearData(): void {}

  setDragImage(): void {}

  dropEffect = "none" as const;
  effectAllowed = "none" as const;
}

function createPasteEvent(dataTransfer: DataTransfer | null): TestPasteEvent {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();

  return {
    preventDefault,
    stopPropagation,
    event: {
      clipboardData: dataTransfer,
      preventDefault,
      stopPropagation,
    } as unknown as PasteCommandType,
  };
}

const editor = {} as LexicalEditor;
const runtime = {} as Parameters<typeof handleBlockEditorPaste>[1];
const payload: BlockEditorClipboardPayload = {
  nodes: [{ text: "Text", type: "text", version: 1 }],
  sourceBlockId: "block-1",
};

describe("clipboard paste", () => {
  beforeEach(() => {
    mocks.insertClipboardPayloadAtSelection.mockReset();
    mocks.insertImageFilesAtSelection.mockReset();
    mocks.insertMarkdownTablesAtSelection.mockReset();
    mocks.insertRichTextDataAtSelection.mockReset();
  });

  it("snapshots clipboard data and strips internal html metadata", () => {
    const dataTransfer = new TestDataTransfer(
      new Map([
        ["text/html", encodeBlockEditorClipboardHtml("<p>Text</p>", payload)],
        ["text/markdown", "**Text**"],
        ["text/plain", "Text"],
      ]),
    ) as unknown as DataTransfer;

    const snapshot = createClipboardDataSnapshot(dataTransfer);

    expect(snapshot.html).toBe("<p>Text</p>");
    expect(snapshot.rawHtml).toBe(encodeBlockEditorClipboardHtml("<p>Text</p>", payload));
    expect(snapshot.markdown).toBe("**Text**");
    expect(snapshot.plainText).toBe("Text");
    expect(snapshot.getData("text/html")).toBe("<p>Text</p>");
    expect(snapshot.files).toEqual([]);
  });

  it("returns false when paste events do not include clipboard data", () => {
    const paste = createPasteEvent(null);

    expect(handleBlockEditorPaste(editor, runtime, paste.event, null)).toBe(false);
    expect(paste.preventDefault).not.toHaveBeenCalled();
    expect(paste.stopPropagation).not.toHaveBeenCalled();
  });

  it("inserts pasted image files before reading editor payloads", () => {
    const file = { name: "photo.png", type: "image/png" };
    const dataTransfer = new TestDataTransfer(
      new Map([["text/html", encodeBlockEditorClipboardHtml("<p>Text</p>", payload)]]),
      [file],
    ) as unknown as DataTransfer;
    const paste = createPasteEvent(dataTransfer);

    expect(handleBlockEditorPaste(editor, runtime, paste.event, null)).toBe(true);

    expect(paste.preventDefault).toHaveBeenCalledOnce();
    expect(paste.stopPropagation).toHaveBeenCalledOnce();
    expect(mocks.insertImageFilesAtSelection).toHaveBeenCalledWith(editor, runtime, [file], null);
    expect(mocks.insertClipboardPayloadAtSelection).not.toHaveBeenCalled();
  });

  it("decodes internal payloads from raw html while passing stripped html to rich text paths", () => {
    const dataTransfer = new TestDataTransfer(
      new Map([["text/html", encodeBlockEditorClipboardHtml("<p>Text</p>", payload)]]),
    ) as unknown as DataTransfer;
    const paste = createPasteEvent(dataTransfer);

    expect(handleBlockEditorPaste(editor, runtime, paste.event, null)).toBe(true);

    expect(mocks.insertClipboardPayloadAtSelection).toHaveBeenCalledWith(
      editor,
      runtime,
      payload,
      null,
    );
    expect(mocks.insertRichTextDataAtSelection).not.toHaveBeenCalled();
  });

  it("inserts markdown tables before falling back to rich text", () => {
    mocks.insertMarkdownTablesAtSelection.mockReturnValue(true);
    const dataTransfer = new TestDataTransfer(
      new Map([
        ["text/html", "<p>fallback</p>"],
        ["text/markdown", "| a | b |\n| --- | --- |\n| c | d |"],
      ]),
    ) as unknown as DataTransfer;
    const paste = createPasteEvent(dataTransfer);

    expect(handleBlockEditorPaste(editor, runtime, paste.event, null)).toBe(true);

    expect(mocks.insertMarkdownTablesAtSelection).toHaveBeenCalledWith(
      editor,
      "| a | b |\n| --- | --- |\n| c | d |",
      null,
    );
    expect(mocks.insertRichTextDataAtSelection).not.toHaveBeenCalled();
  });

  it("falls back to rich text insertion with sanitized html", () => {
    mocks.insertMarkdownTablesAtSelection.mockReturnValue(false);
    const dataTransfer = new TestDataTransfer(
      new Map([
        ["text/html", "<p>fallback</p>"],
        ["text/plain", "fallback"],
      ]),
    ) as unknown as DataTransfer;
    const paste = createPasteEvent(dataTransfer);

    expect(handleBlockEditorPaste(editor, runtime, paste.event, null)).toBe(true);

    const [, richTextData] = mocks.insertRichTextDataAtSelection.mock.calls[0] ?? [];
    expect(richTextData.getData("text/html")).toBe("<p>fallback</p>");
    expect(richTextData.getData("text/plain")).toBe("fallback");
  });
});
