import { describe, expect, it, vi } from "vite-plus/test";

import {
  createBlockEditorRuntime,
  editorFromMarkdown,
  readMarkdown,
} from "../test-helper/editor-driver";
import { pasteIntoEditor, TestDataTransfer } from "../test-helper/interaction-driver";
import { createClipboardDataSnapshot, handleBlockEditorPaste } from "./paste";

describe("clipboard paste", () => {
  it("captures html and plain text clipboard formats", () => {
    const dataTransfer = new TestDataTransfer(
      new Map([
        ["text/html", "<p>Text</p>"],
        ["text/plain", "Text"],
      ]),
    ) as unknown as DataTransfer;

    const snapshot = createClipboardDataSnapshot(dataTransfer);

    expect(snapshot.html).toBe("<p>Text</p>");
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

  it("prefers pasted html over plain markdown", async () => {
    const editor = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime();

    expect(
      pasteIntoEditor(
        editor,
        runtime,
        new Map([
          ["text/html", "<h1>HTML</h1>"],
          ["text/plain", "# Plain"],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMarkdown(editor).trim()).toBe("# HTML");
    });
  });

  it("parses pasted plain text as markdown", async () => {
    const editor = editorFromMarkdown("");

    expect(
      pasteIntoEditor(
        editor,
        createBlockEditorRuntime(),
        new Map([["text/plain", "# Heading\n\n- item"]]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMarkdown(editor)).toContain("# Heading");
      expect(readMarkdown(editor)).toContain("- item");
    });
  });

  it("imports file image sources from pasted html", async () => {
    const editor = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime({
      assets: {
        importFiles: vi.fn(async () => ({
          assets: [
            {
              altText: "photo.png",
              assetUrl: "assets://created/photo.png",
              fileUrl: "file:///tmp/photo.png",
            },
            {
              error: "IMPORT_FAILED",
              fileUrl: "file:///tmp/missing.png",
            },
          ],
        })),
      },
    });

    expect(
      pasteIntoEditor(
        editor,
        runtime,
        new Map([
          [
            "text/html",
            [
              '<p><img src="file:///tmp/photo.png" alt="Photo"></p>',
              '<p><img src="file:///tmp/missing.png" alt="Missing"></p>',
              '<p><a href="file:///tmp/document.pdf">Local</a></p>',
            ].join(""),
          ],
          ["text/plain", "plain fallback"],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMarkdown(editor)).toContain("![Photo](assets://created/photo.png)");
      expect(readMarkdown(editor)).toContain("![](Unavailable)");
      expect(readMarkdown(editor)).toContain("[Local](file:///tmp/document.pdf)");
    });
    expect(runtime.assets.importFiles).toHaveBeenCalledWith({
      files: [{ fileUrl: "file:///tmp/photo.png" }, { fileUrl: "file:///tmp/missing.png" }],
    });
  });

  it("imports pasted image files before falling back to html image content", async () => {
    const editor = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime({
      assets: {
        create: vi.fn(async () => ({
          assets: [{ altText: "Pasted", assetUrl: "assets://created/pasted.png" }],
        })),
        importFiles: vi.fn(async () => ({
          assets: [{ assetUrl: "assets://html/remote.png", fileUrl: "file:///tmp/html.png" }],
        })),
      },
    });
    const image = new File(["image"], "pasted.png", { type: "image/png" });

    expect(
      pasteIntoEditor(
        editor,
        runtime,
        new Map([
          ["text/html", '<p><img src="https://example.com/remote.png" alt="Remote"></p>'],
          ["text/plain", "plain fallback"],
        ]),
        [image],
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMarkdown(editor)).toContain("![Pasted](assets://created/pasted.png)");
    });
    expect(readMarkdown(editor)).not.toContain("https://example.com/remote.png");
    expect(runtime.assets.create).toHaveBeenCalledWith({
      assets: [
        {
          dataBase64: "aW1hZ2U=",
          fileName: "pasted.png",
          mimeType: "image/png",
        },
      ],
    });
    expect(runtime.assets.importFiles).not.toHaveBeenCalled();
  });

  it("imports file image destinations from pasted plain markdown", async () => {
    const editor = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime({
      assets: {
        importFiles: vi.fn(async () => ({
          assets: [
            {
              altText: "photo.png",
              assetUrl: "assets://created/photo.png",
              fileUrl: "file:///tmp/photo.png",
            },
          ],
        })),
      },
    });

    expect(
      pasteIntoEditor(
        editor,
        runtime,
        new Map([["text/plain", "![Photo](file:///tmp/photo.png)"]]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMarkdown(editor)).toContain("![Photo](assets://created/photo.png)");
    });
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
