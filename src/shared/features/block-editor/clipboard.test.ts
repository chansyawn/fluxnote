import { describe, expect, it } from "vite-plus/test";

import { blockEditorClipboardWriteRequestSchema } from "./clipboard";

describe("block editor clipboard contract", () => {
  it("accepts standard clipboard write data", () => {
    const result = blockEditorClipboardWriteRequestSchema.safeParse({
      html: "<p>Text</p>",
      imageFileUrl: "file:///tmp/photo.png",
      text: "Text",
    });

    expect(result.success).toBe(true);
  });

  it("rejects private metadata payloads", () => {
    const result = blockEditorClipboardWriteRequestSchema.strict().safeParse({
      html: "<p>Text</p>",
      payload: { sourceBlockId: "block-1" },
      text: "Text",
    });

    expect(result.success).toBe(false);
  });
});
