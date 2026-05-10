import {
  $createNodeSelection,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $selectAll,
  $setSelection,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { $createImageNode } from "../syntax/image";
import { editorFromMarkdown } from "../test-helper/editor-driver";
import {
  exportClipboardSnapshotFromDocument,
  exportClipboardSnapshotFromSelection,
} from "./clipboard-export";

describe("clipboard export", () => {
  it("returns null for collapsed selections", () => {
    const editor = editorFromMarkdown("Hello");

    const snapshot = editor.read(() => {
      const selection = $getSelection();
      return selection
        ? exportClipboardSnapshotFromSelection(editor, selection, { includeImageFileUrl: true })
        : null;
    });

    expect(snapshot).toBeNull();
  });

  it("exports selected image metadata for native image clipboard writes", () => {
    const editor = editorFromMarkdown("");
    let snapshot: ReturnType<typeof exportClipboardSnapshotFromSelection> = null;

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

        snapshot = exportClipboardSnapshotFromSelection(editor, selection, {
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
    let snapshot: ReturnType<typeof exportClipboardSnapshotFromDocument> = null;

    editor.update(() => {
      snapshot = exportClipboardSnapshotFromDocument(editor, $selectAll());
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
});
