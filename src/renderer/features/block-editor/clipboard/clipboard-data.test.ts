import { $createNodeSelection, $createParagraphNode, $getRoot, $setSelection } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { $createImageNode } from "../syntax/image";
import { editorFromMarkdown } from "../test-helper/editor-driver";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";

describe("clipboard data", () => {
  it("creates document clipboard data without resolving assets when none exist", async () => {
    const editor = editorFromMarkdown("Hello");
    const resolveAssets = vi.fn(async () => ({ assets: [] }));

    const data = await createClipboardDataFromDocument(editor, resolveAssets);

    expect(data).toEqual(
      expect.objectContaining({
        nodes: expect.any(Array),
        text: expect.stringContaining("Hello"),
      }),
    );
    expect(data?.html).toContain("Hello");
    expect(resolveAssets).not.toHaveBeenCalled();
  });

  it("rewrites image assets for external clipboard formats while preserving payload nodes", async () => {
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
    expect(data?.nodes[0]?.src).toBe("assets://block/photo.png");
    expect(data?.text).toContain("file:///tmp/photo.png");
    expect(data?.html).toContain("file:///tmp/photo.png");
    expect(resolveAssets).toHaveBeenCalledWith({
      assetUrls: ["assets://block/photo.png"],
    });
  });
});
