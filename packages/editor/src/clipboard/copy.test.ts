import { LexicalBuilder } from "@lexical/extension";
import {
  $createNodeSelection,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $setSelection,
  COPY_COMMAND,
  configExtension,
  type LexicalEditor,
} from "lexical";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createBlockEditorCoreExtension } from "../core/block-editor-core-extension";
import { importMarkdownToEditor } from "../document/markdown-editor-io";
import { BlockEditorRuntimeExtension } from "../runtime/runtime-extension";
import { $createImageNode } from "../syntax/image";
import {
  createBlockEditorRuntime,
  editorFromMarkdown,
  editorFromMdast,
} from "../test-helper/editor-driver";
import { selectTextRange } from "../test-helper/interaction-driver";
import { doc, p, t } from "../test-helper/mdast-builders";
import { ClipboardExtension } from "./clipboard-extension";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
  createClipboardSnapshotFromDocument,
  createClipboardSnapshotFromSelection,
} from "./copy";

class TestClipboardEvent extends Event {
  readonly clipboardData: CopyDataTransfer | null;

  constructor(dataTransfer: CopyDataTransfer | null) {
    super("copy");
    this.clipboardData = dataTransfer;
  }
}

class CopyDataTransfer {
  readonly data = new Map<string, string>();

  setData(type: string, value: string): void {
    this.data.set(type, value);
  }
}

function createCopyEvent(dataTransfer = new CopyDataTransfer()): ClipboardEvent {
  return new TestClipboardEvent(dataTransfer) as unknown as ClipboardEvent;
}

function createClipboardEditor(runtime = createBlockEditorRuntime()) {
  const editor = LexicalBuilder.fromExtensions([
    createBlockEditorCoreExtension(),
    configExtension(BlockEditorRuntimeExtension, { runtime }),
    ClipboardExtension,
  ]).buildEditor();

  return { editor, runtime };
}

function dispatchCopy(editor: LexicalEditor, event: ClipboardEvent) {
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(COPY_COMMAND, event);
    },
    { discrete: true },
  );
  return handled;
}

async function waitForClipboardWrite(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clipboard copy", () => {
  it("returns null for collapsed selections", () => {
    const editor = editorFromMarkdown("Hello");

    const snapshot = editor.read(() => {
      const selection = $getSelection();
      return selection
        ? createClipboardSnapshotFromSelection(editor, selection, { includeImageFileUrl: true })
        : null;
    });

    expect(snapshot).toBeNull();
  });

  it("writes selected clipboard data synchronously during copy events", async () => {
    vi.stubGlobal("ClipboardEvent", TestClipboardEvent);
    const { editor, runtime } = createClipboardEditor();
    const dataTransfer = new CopyDataTransfer();
    const event = createCopyEvent(dataTransfer);
    const preventDefault = vi.spyOn(event, "preventDefault");

    importMarkdownToEditor(editor, "Hello");
    selectTextRange(editor, "Hello", 0, 5);

    const handled = dispatchCopy(editor, event);
    await waitForClipboardWrite();

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(dataTransfer.data.get("text/plain")?.trim()).toBe("Hello");
    expect(dataTransfer.data.get("text/html")).toContain("Hello");
    expect(runtime.clipboard.write).toHaveBeenCalledOnce();
  });

  it("keeps synchronous copy data when enhanced clipboard writes fail", async () => {
    vi.stubGlobal("ClipboardEvent", TestClipboardEvent);
    const runtime = createBlockEditorRuntime({
      clipboard: {
        write: vi.fn(async () => {
          throw new Error("Clipboard write failed.");
        }),
      },
    });
    const { editor } = createClipboardEditor(runtime);
    const dataTransfer = new CopyDataTransfer();

    importMarkdownToEditor(editor, "Hello");
    selectTextRange(editor, "Hello", 0, 5);

    const handled = dispatchCopy(editor, createCopyEvent(dataTransfer));
    await waitForClipboardWrite();

    expect(handled).toBe(true);
    expect(dataTransfer.data.get("text/plain")?.trim()).toBe("Hello");
    expect(runtime.clipboard.write).toHaveBeenCalledOnce();
  });

  it("does not run enhanced copy without selected content", async () => {
    vi.stubGlobal("ClipboardEvent", TestClipboardEvent);
    const { editor, runtime } = createClipboardEditor();
    const dataTransfer = new CopyDataTransfer();
    const event = createCopyEvent(dataTransfer);

    dispatchCopy(editor, event);
    await waitForClipboardWrite();

    expect(dataTransfer.data.size).toBe(0);
    expect(runtime.clipboard.write).not.toHaveBeenCalled();
  });

  it("preserves enhanced selected image clipboard writes", async () => {
    vi.stubGlobal("ClipboardEvent", TestClipboardEvent);
    const runtime = createBlockEditorRuntime({
      assets: {
        resolve: vi.fn(async () => ({
          assets: [
            {
              assetUrl: "assets://block/photo.png",
              fileUrl: "file:///tmp/photo.png",
            },
          ],
        })),
      },
    });
    const { editor } = createClipboardEditor(runtime);
    const dataTransfer = new CopyDataTransfer();

    editor.update(
      () => {
        const imageNode = $createImageNode({
          alt: "Photo",
          src: "assets://block/photo.png",
          title: null,
        });
        $getRoot().clear().append($createParagraphNode().append(imageNode));

        const selection = $createNodeSelection();
        selection.add(imageNode.getKey());
        $setSelection(selection);
      },
      { discrete: true },
    );

    const handled = dispatchCopy(editor, createCopyEvent(dataTransfer));
    await waitForClipboardWrite();

    expect(handled).toBe(true);
    expect(dataTransfer.data.get("text/plain")).toContain("assets://block/photo.png");
    expect(runtime.clipboard.write).toHaveBeenCalledWith(
      expect.objectContaining({
        imageFileUrl: "file:///tmp/photo.png",
        text: expect.stringContaining("file:///tmp/photo.png"),
      }),
    );
  });

  it("exports selected image metadata for native image clipboard writes", () => {
    const editor = editorFromMarkdown("");
    let snapshot: ReturnType<typeof createClipboardSnapshotFromSelection> = null;

    editor.update(
      () => {
        const imageNode = $createImageNode({
          alt: "Photo",
          src: "assets://block/photo.png",
          title: null,
        });
        $getRoot().clear().append($createParagraphNode().append(imageNode));

        const selection = $createNodeSelection();
        selection.add(imageNode.getKey());
        $setSelection(selection);

        snapshot = createClipboardSnapshotFromSelection(editor, selection, {
          includeImageFileUrl: true,
        });
      },
      { discrete: true },
    );

    expect(snapshot).toEqual(
      expect.objectContaining({
        assetUrls: ["assets://block/photo.png"],
        imageAssetUrl: "assets://block/photo.png",
        markdown: expect.stringContaining("assets://block/photo.png"),
        nodes: [expect.objectContaining({ src: "assets://block/photo.png", type: "image" })],
      }),
    );
  });

  it("exports full document nodes without native image metadata", () => {
    const editor = editorFromMarkdown("Hello");
    let snapshot: ReturnType<typeof createClipboardSnapshotFromDocument> = null;

    editor.update(() => {
      snapshot = createClipboardSnapshotFromDocument();
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        assetUrls: [],
        imageAssetUrl: null,
        markdown: expect.stringContaining("Hello"),
        nodes: [expect.objectContaining({ type: "paragraph" })],
      }),
    );
  });

  it("creates document clipboard data without resolving assets when none exist", async () => {
    const editor = editorFromMarkdown("Hello");
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data).toEqual(
      expect.objectContaining({
        text: expect.stringContaining("Hello"),
      }),
    );
    expect(data?.html).toContain("Hello");
  });

  it("creates semantic document html for external clipboard writes", async () => {
    const editor = editorFromMarkdown(
      ["# Title", "", "**bold** *emphasis* ~~removed~~ `code` [link](https://example.com)"].join(
        "\n",
      ),
    );
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data?.html).toContain("<h1>Title</h1>");
    expect(data?.html).toContain(
      '<p><strong>bold</strong> <em>emphasis</em> <del>removed</del> <code>code</code> <a href="https://example.com">link</a></p>',
    );
    expect(data?.html).not.toContain("block-editor__");
  });

  it("preserves block structures in semantic document html", async () => {
    const editor = editorFromMarkdown(
      [
        "```ts",
        "const value = 1;",
        "```",
        "",
        "| Name | Value |",
        "| - | - |",
        "| alpha | 1 |",
        "",
        "> quoted",
        "",
        "---",
      ].join("\n"),
    );
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data?.html).toContain('<pre><code class="language-ts">const value = 1;');
    expect(data?.html).toContain("<table>");
    expect(data?.html).toContain("<th>Name</th>");
    expect(data?.html).toContain("<td>alpha</td>");
    expect(data?.html).toContain("<blockquote>");
    expect(data?.html).toContain("<p>quoted</p>");
    expect(data?.html).toContain("<hr>");
  });

  it("preserves list, task, link, image, and escaped text semantics in clipboard formats", async () => {
    const editor = editorFromMarkdown(
      [
        "## Heading",
        "",
        "Line one  ",
        "Line two with <tag> & chars",
        "",
        "1. first",
        "2. second",
        "",
        "- [ ] todo",
        "- [x] done",
        "",
        "> quote line",
        ">",
        "> - nested",
        "",
        '[explicit](https://example.com "Title") and https://bare.example/path',
        "",
        '![Alt <x>](assets://block/photo.png "Caption")',
      ].join("\n"),
    );
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data?.html).toContain("<h2>Heading</h2>");
    expect(data?.html).toContain("Line two with &#x3C;tag> &#x26; chars");
    expect(data?.html).toContain("<ol>");
    expect(data?.html).toContain("<li>first</li>");
    expect(data?.html).toContain('<ul class="contains-task-list">');
    expect(data?.html).toContain('<li class="task-list-item"><input type="checkbox" disabled>');
    expect(data?.html).toContain(
      '<li class="task-list-item"><input type="checkbox" checked disabled>',
    );
    expect(data?.html).toContain("<blockquote>");
    expect(data?.html).toContain("<li>nested</li>");
    expect(data?.html).toContain('<a href="https://example.com" title="Title">explicit</a>');
    expect(data?.html).toContain(
      '<img src="assets://block/photo.png" alt="Alt <x>" title="Caption">',
    );
    expect(data?.text).toContain("## Heading");
    expect(data?.text).toContain("Line two with \\<tag> & chars");
    expect(data?.text).toContain("- [ ] todo");
    expect(data?.text).toContain("- [x] done");
    expect(data?.text).toContain('[explicit](https://example.com "Title")');
    expect(data?.text).toContain('![Alt \\<x>](assets://block/photo.png "Caption")');
  });

  it("normalizes markdown text for external clipboard writes", async () => {
    const editor = editorFromMarkdown("a_b $5");
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data?.text.trim()).toBe("a_b $5");
  });

  it("decodes markdown whitespace entities for external clipboard text", async () => {
    const editor = editorFromMdast(doc(p(t("Alpha "))));
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data?.text).toBe("Alpha \n");
    expect(data?.text).not.toContain("&#x20;");
  });

  it("rewrites image assets for external clipboard formats", async () => {
    const editor = editorFromMarkdown("");

    editor.update(
      () => {
        const imageNode = $createImageNode({
          alt: "Photo",
          src: "assets://block/photo.png",
          title: null,
        });
        const paragraph = $createParagraphNode().append(imageNode);
        $getRoot().clear().append(paragraph);

        const selection = $createNodeSelection();
        selection.add(imageNode.getKey());
        $setSelection(selection);
      },
      { discrete: true },
    );

    const resolveAssets = vi.fn(async () => ({
      assets: [
        {
          assetUrl: "assets://block/photo.png",
          fileUrl: "file:///tmp/photo.png",
        },
      ],
    }));

    const data = await createClipboardDataFromCurrentSelection(editor, resolveAssets);

    expect(data?.imageFileUrl).toBe("file:///tmp/photo.png");
    expect(data?.text).toContain("file:///tmp/photo.png");
    expect(data?.html).toContain("file:///tmp/photo.png");
    expect(resolveAssets).toHaveBeenCalledWith({
      assetUrls: ["assets://block/photo.png"],
    });
  });

  it("downgrades copied image assets when they cannot be resolved", async () => {
    const editor = editorFromMarkdown('![Photo](assets://block/missing.png "Caption")');
    const resolveAssets = vi.fn(async () => ({ assets: [] }));

    const data = await createClipboardDataFromDocument(editor, resolveAssets);

    expect(data?.imageFileUrl).toBeUndefined();
    expect(data?.text).toContain("![](Unavailable)");
    expect(data?.html).toContain('<img src="Unavailable" alt="">');
  });
});
