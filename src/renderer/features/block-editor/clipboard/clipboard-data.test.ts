import type { ResolveAssetRequest } from "@renderer/clients";
import {
  $createNodeSelection,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { importMarkdownToEditor } from "../editor-state";
import { $isImageNode } from "../syntax/image";
import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";
import {
  BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL,
  BLOCK_EDITOR_CLIPBOARD_MIME,
  parseBlockEditorClipboardPayload,
} from "./clipboard-payload";

function createEditorWithMarkdown(markdown: string): LexicalEditor {
  const editor = createHeadlessMarkdownEditor("SourceBlockEditor");
  importMarkdownToEditor(editor, markdown);
  return editor;
}

function visitTextNodes(node: LexicalNode, visit: (node: LexicalNode) => boolean): boolean {
  if (visit(node)) {
    return true;
  }

  if (!$isElementNode(node)) {
    return false;
  }

  return node.getChildren().some((child) => visitTextNodes(child, visit));
}

function selectText(editor: LexicalEditor, value: string): void {
  editor.update(
    () => {
      const found = visitTextNodes($getRoot(), (node) => {
        if (!$isTextNode(node)) {
          return false;
        }

        const start = node.getTextContent().indexOf(value);
        if (start === -1) {
          return false;
        }

        node.select(start, start + value.length);
        return true;
      });

      if (!found) {
        throw new Error(`Text not found: ${value}`);
      }
    },
    { discrete: true },
  );
}

function selectImage(editor: LexicalEditor): void {
  editor.update(
    () => {
      let imageKey: string | null = null;

      const visit = (node: LexicalNode): boolean => {
        if ($isImageNode(node)) {
          imageKey = node.getKey();
          return true;
        }

        if (!$isElementNode(node)) {
          return false;
        }

        return node.getChildren().some(visit);
      };

      if (!visit($getRoot()) || imageKey === null) {
        throw new Error("Image not found");
      }

      const selection = $createNodeSelection();
      selection.add(imageKey);
      $setSelection(selection);
    },
    { discrete: true },
  );
}

describe("block editor clipboard data", () => {
  it("exports the full document with one application payload", async () => {
    const editor = createEditorWithMarkdown(["# Title", "", "Text **bold**"].join("\n"));

    const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
      assets: [],
    }));
    const payload = data
      ? parseBlockEditorClipboardPayload(data[BLOCK_EDITOR_CLIPBOARD_MIME])
      : null;

    expect(data?.["application/x-lexical-editor" as keyof typeof data]).toBeUndefined();
    expect(data?.["text/plain"]).toBe(["# Title", "", "Text **bold**", ""].join("\n"));
    expect(data?.["text/html"]).toContain("Title");
    expect(payload).toMatchObject({
      nodes: [{ type: "heading" }, { type: "paragraph" }],
      sourceBlockId: "block-1",
    });
  });

  it("exports selected inline content as markdown", async () => {
    const editor = createEditorWithMarkdown("Text **bold** after");
    selectText(editor, "bold");

    const data = await createClipboardDataFromCurrentSelection(editor, "block-1", async () => ({
      assets: [],
    }));
    const payload = data
      ? parseBlockEditorClipboardPayload(data[BLOCK_EDITOR_CLIPBOARD_MIME])
      : null;

    expect(data?.["text/plain"]).toBe("**bold**\n");
    expect(data?.["text/html"]).toContain("bold");
    expect(payload).toMatchObject({
      nodes: [{ type: "text" }],
      sourceBlockId: "block-1",
    });
  });

  it("replaces internal asset urls with file urls for html and plain text", async () => {
    const editor = createEditorWithMarkdown("![Alt](assets://block-1/photo.png)");
    const resolveAssets = vi.fn(async (request: ResolveAssetRequest) => {
      expect(request).toEqual({ assetUrls: ["assets://block-1/photo.png"] });
      return {
        assets: [
          {
            assetUrl: "assets://block-1/photo.png",
            fileUrl: "file:///tmp/block-1/photo.png",
          },
        ],
      };
    });

    const data = await createClipboardDataFromDocument(editor, "block-1", resolveAssets);
    const payload = data
      ? parseBlockEditorClipboardPayload(data[BLOCK_EDITOR_CLIPBOARD_MIME])
      : null;

    expect(data?.["text/plain"]).toBe("![Alt](file:///tmp/block-1/photo.png)\n");
    expect(data?.["text/html"]).toContain("file:///tmp/block-1/photo.png");
    expect(payload?.assets).toEqual([
      {
        assetUrl: "assets://block-1/photo.png",
        fileUrl: "file:///tmp/block-1/photo.png",
      },
    ]);
  });

  it("exports an image file url for a selected single asset image", async () => {
    const editor = createEditorWithMarkdown("![Alt](assets://block-1/photo.png)");
    selectImage(editor);
    const resolveAssets = vi.fn(async (request: ResolveAssetRequest) => {
      expect(request).toEqual({ assetUrls: ["assets://block-1/photo.png"] });
      return {
        assets: [
          {
            assetUrl: "assets://block-1/photo.png",
            fileUrl: "file:///tmp/block-1/photo.png",
          },
        ],
      };
    });

    const data = await createClipboardDataFromCurrentSelection(editor, "block-1", resolveAssets);

    expect(data?.[BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]).toBe("file:///tmp/block-1/photo.png");
    expect(data?.["text/plain"]).toBe("![Alt](file:///tmp/block-1/photo.png)\n");
  });

  it("does not export an image file url for full document copy", async () => {
    const editor = createEditorWithMarkdown("![Alt](assets://block-1/photo.png)");

    const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
      assets: [
        {
          assetUrl: "assets://block-1/photo.png",
          fileUrl: "file:///tmp/block-1/photo.png",
        },
      ],
    }));

    expect(data?.[BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]).toBeUndefined();
  });

  it("does not export an image file url for selected remote images", async () => {
    const editor = createEditorWithMarkdown("![Alt](https://example.com/photo.png)");
    selectImage(editor);

    const data = await createClipboardDataFromCurrentSelection(editor, "block-1", async () => ({
      assets: [],
    }));

    expect(data?.[BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]).toBeUndefined();
    expect(data?.["text/plain"]).toBe("![Alt](https://example.com/photo.png)\n");
  });

  it("does not export collapsed selections", async () => {
    const editor = createEditorWithMarkdown("Text");
    selectText(editor, "");

    await expect(createClipboardDataFromCurrentSelection(editor, "block-1")).resolves.toBeNull();
  });
});
