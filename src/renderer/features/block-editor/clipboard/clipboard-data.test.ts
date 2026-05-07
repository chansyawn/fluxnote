import type { ResolveAssetRequest } from "@renderer/clients";
import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { importMarkdownToEditor } from "../editor-state";
import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";
import { BLOCK_EDITOR_CLIPBOARD_MIME, parseBlockEditorClipboardPayload } from "./clipboard-payload";

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

  it("does not export collapsed selections", async () => {
    const editor = createEditorWithMarkdown("Text");
    selectText(editor, "");

    await expect(createClipboardDataFromCurrentSelection(editor, "block-1")).resolves.toBeNull();
  });
});
