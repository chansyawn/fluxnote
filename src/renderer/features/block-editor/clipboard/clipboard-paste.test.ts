import {
  encodeBlockEditorClipboardHtml,
  type BlockEditorClipboardPayload,
} from "@shared/features/block-editor/clipboard";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createBlockEditorRuntime,
  editorFromMarkdown,
  readMarkdown,
} from "../test-helper/editor-driver";
import { pasteIntoEditor, TestDataTransfer } from "../test-helper/interaction-driver";
import { createClipboardDataSnapshot, handleBlockEditorPaste } from "./clipboard-paste";

function textNode(text: string) {
  return {
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    type: "text",
    version: 1,
  };
}

const payload: BlockEditorClipboardPayload = {
  nodes: [textNode("Text")],
  sourceBlockId: "source-block",
};

describe("clipboard paste", () => {
  it("strips internal clipboard metadata from html exposed to fallback rich text insertion", () => {
    const dataTransfer = new TestDataTransfer(
      new Map([
        ["text/html", encodeBlockEditorClipboardHtml("<p>Text</p>", payload)],
        ["text/plain", "Text"],
      ]),
    ) as unknown as DataTransfer;

    const snapshot = createClipboardDataSnapshot(dataTransfer);

    expect(snapshot.html).toBe("<p>Text</p>");
    expect(snapshot.rawHtml).toBe(encodeBlockEditorClipboardHtml("<p>Text</p>", payload));
    expect(snapshot.plainText).toBe("Text");
    expect(snapshot.getData("text/html")).toBe("<p>Text</p>");
    expect(snapshot.files).toEqual([]);
  });

  it("ignores paste events without clipboard data", () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      clipboardData: null,
      preventDefault,
      stopPropagation,
    } as unknown as Parameters<typeof handleBlockEditorPaste>[2];

    expect(
      handleBlockEditorPaste(
        editorFromMarkdown("Existing"),
        createBlockEditorRuntime(),
        event,
        null,
      ),
    ).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it("restores internal Block Editor payloads before markdown fallback", async () => {
    const editor = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime();

    expect(
      pasteIntoEditor(
        editor,
        runtime,
        new Map([
          ["text/html", encodeBlockEditorClipboardHtml("<p>fallback</p>", payload)],
          ["text/plain", "# fallback"],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMarkdown(editor).trim()).toBe("Text");
    });
  });

  it("parses pasted plain text as markdown", () => {
    const editor = editorFromMarkdown("");

    expect(
      pasteIntoEditor(
        editor,
        createBlockEditorRuntime(),
        new Map([["text/plain", "# Heading\n\n- item"]]),
      ),
    ).toBe(true);

    expect(readMarkdown(editor)).toContain("# Heading");
    expect(readMarkdown(editor)).toContain("- item");
  });

  it("inserts pasted image files through the runtime asset boundary", async () => {
    const editor = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime({
      assets: {
        create: vi.fn(async () => ({
          assets: [{ altText: "Photo", assetUrl: "assets://created/photo.png" }],
        })),
      },
    });
    const image = new File(["image"], "photo.png", { type: "image/png" });

    expect(pasteIntoEditor(editor, runtime, new Map(), [image])).toBe(true);
    await vi.waitFor(() => {
      expect(readMarkdown(editor)).toContain("assets://created/photo.png");
    });
    expect(runtime.assets.create).toHaveBeenCalledWith({
      assets: [
        {
          dataBase64: "aW1hZ2U=",
          fileName: "photo.png",
          mimeType: "image/png",
        },
      ],
    });
  });
});
