import { $getSelection } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createBlockEditorRuntime,
  editorFromMarkdown,
  readMdast,
  readMarkdown,
} from "../test-helper/editor-driver";
import { pasteIntoEditor, selectText, TestDataTransfer } from "../test-helper/interaction-driver";
import { createClipboardDataFromDocument } from "./copy";
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

  it("pastes editor clipboard lists through markdown to preserve nested structure", async () => {
    const source = editorFromMarkdown(
      ["- Unordered item", "", "- Nested group", "", "  - Nested item A", "  - Nested item B"].join(
        "\n",
      ),
    );
    const target = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime();
    const data = await createClipboardDataFromDocument(source, runtime.assets.resolve);

    expect(data?.html).toContain('data-fluxnotes-clipboard="v1"');
    expect(
      pasteIntoEditor(
        target,
        runtime,
        new Map([
          ["text/html", data?.html ?? ""],
          ["text/plain", data?.text ?? ""],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      const markdown = readMarkdown(target);
      expect(markdown).toContain("- Unordered item");
      expect(markdown).toContain("- Nested group");
      expect(markdown).toContain("  - Nested item A");
      expect(markdown).toContain("  - Nested item B");
      expect(markdown).not.toContain("\n- \n");
    });
  });

  it("pastes editor clipboard lists with a nested list under the first item", async () => {
    const source = editorFromMarkdown(
      ["- Nested group", "", "  - Nested item A", "  - Nested item B"].join("\n"),
    );
    const target = editorFromMarkdown("");
    const runtime = createBlockEditorRuntime();
    const data = await createClipboardDataFromDocument(source, runtime.assets.resolve);

    expect(
      pasteIntoEditor(
        target,
        runtime,
        new Map([
          ["text/html", data?.html ?? ""],
          ["text/plain", data?.text ?? ""],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      const markdown = readMarkdown(target);
      expect(markdown).toContain("- Nested group");
      expect(markdown).toContain("  - Nested item A");
      expect(markdown).toContain("  - Nested item B");
      expect(markdown).not.toContain("\nNested group");
    });
  });

  it("pastes plain text from mixed html clipboard data inside a code block", async () => {
    const editor = editorFromMarkdown(["```", "const value = 1;", "```", ""].join("\n"));
    selectText(editor, "const value = 1;", "const ".length);

    expect(
      pasteIntoEditor(
        editor,
        createBlockEditorRuntime(),
        new Map([
          ["text/html", "<h1>HTML</h1>"],
          ["text/plain", "# Plain"],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMdast(editor).children[0]).toMatchObject({
        type: "code",
        value: "const # Plainvalue = 1;",
      });
    });
  });

  it("pastes plain text inside a code block from a nested command update", () => {
    const editor = editorFromMarkdown(["```", "const value = 1;", "```", ""].join("\n"));
    const runtime = createBlockEditorRuntime();
    selectText(editor, "const value = 1;", "const ".length);
    const event = {
      clipboardData: new TestDataTransfer(
        new Map([
          ["text/html", "<h1>HTML</h1>"],
          ["text/plain", "# Plain"],
        ]),
      ),
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Parameters<typeof handleBlockEditorPaste>[2];
    const selection = editor.read(() => $getSelection()?.clone() ?? null);

    expect(() => {
      editor.update(
        () => {
          handleBlockEditorPaste(editor, runtime, event, selection);
        },
        { discrete: true },
      );
    }).not.toThrow();

    expect(readMdast(editor).children[0]).toMatchObject({
      type: "code",
      value: "const # Plainvalue = 1;",
    });
  });

  it("preserves markdown-looking plain text inside a code block", async () => {
    const editor = editorFromMarkdown(["```", "before", "```", ""].join("\n"));
    selectText(editor, "before");

    expect(
      pasteIntoEditor(
        editor,
        createBlockEditorRuntime(),
        new Map([["text/plain", "# Heading\n\n- item\n\n[link](https://example.com)"]]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMdast(editor).children[0]).toMatchObject({
        type: "code",
        value: "before# Heading\n\n- item\n\n[link](https://example.com)",
      });
    });
  });

  it("does not create block assets from pasted image files inside a code block", () => {
    const editor = editorFromMarkdown(["```", "code", "```", ""].join("\n"));
    const runtime = createBlockEditorRuntime();
    const image = new File(["image"], "pasted.png", { type: "image/png" });
    selectText(editor, "code");

    expect(pasteIntoEditor(editor, runtime, new Map(), [image])).toBe(true);

    expect(readMdast(editor).children[0]).toMatchObject({
      type: "code",
      value: "code",
    });
    expect(runtime.assets.create).not.toHaveBeenCalled();
    expect(runtime.assets.importFiles).not.toHaveBeenCalled();
  });

  it("does not import local html image sources inside a code block", () => {
    const editor = editorFromMarkdown(["```", "code", "```", ""].join("\n"));
    const runtime = createBlockEditorRuntime();
    selectText(editor, "code");

    expect(
      pasteIntoEditor(
        editor,
        runtime,
        new Map([["text/html", '<p><img src="file:///tmp/photo.png" alt="Photo"></p>']]),
      ),
    ).toBe(true);

    expect(readMdast(editor).children[0]).toMatchObject({
      type: "code",
      value: "code",
    });
    expect(runtime.assets.create).not.toHaveBeenCalled();
    expect(runtime.assets.importFiles).not.toHaveBeenCalled();
  });

  it("pastes html blocks into a table cell as literal markdown text", async () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", "| a  |", ""].join("\n"));
    selectText(editor, "a");

    expect(
      pasteIntoEditor(
        editor,
        createBlockEditorRuntime(),
        new Map([
          ["text/html", "<h1>Heading</h1><ul><li>one</li><li>two</li></ul>"],
          ["text/plain", "# Heading\n\n- one\n- two"],
        ]),
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(readMdast(editor).children[0]).toMatchObject({
        children: [
          {
            children: [{ children: [{ type: "text", value: "h1" }], type: "tableCell" }],
            type: "tableRow",
          },
          {
            children: [
              {
                children: [{ type: "text", value: "a # Heading - one\n- two" }],
                type: "tableCell",
              },
            ],
            type: "tableRow",
          },
        ],
        type: "table",
      });
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
