import { describe, expect, it } from "vite-plus/test";

import {
  decodeBlockEditorClipboardHtml,
  encodeBlockEditorClipboardHtml,
  stripBlockEditorClipboardHtmlMetadata,
  type BlockEditorClipboardPayload,
} from "./clipboard";

const payload: BlockEditorClipboardPayload = {
  nodes: [{ text: "Text", type: "text", version: 1 }],
  sourceBlockId: "block-1",
};

describe("block editor clipboard html metadata", () => {
  it("encodes and decodes a payload without changing visible html", () => {
    const html = encodeBlockEditorClipboardHtml("<p>Text</p>", payload);

    expect(decodeBlockEditorClipboardHtml(html)).toEqual(payload);
    expect(stripBlockEditorClipboardHtmlMetadata(html)).toBe("<p>Text</p>");
  });

  it("returns null when metadata is missing or invalid", () => {
    expect(decodeBlockEditorClipboardHtml("<p>Text</p>")).toBeNull();
    expect(
      decodeBlockEditorClipboardHtml("<!--fluxnotes-block-editor:bad--><p>Text</p>"),
    ).toBeNull();
  });
});
