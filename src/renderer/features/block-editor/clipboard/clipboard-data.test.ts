import { $createNodeSelection, $createParagraphNode, $getRoot, $setSelection } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { $createImageNode } from "../syntax/image";
import {
  createBlockEditorRuntime,
  editorFromMarkdown,
  editorFromMdast,
} from "../test-helper/editor-driver";
import { doc, p, t } from "../test-helper/mdast-builders";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";

describe("clipboard data", () => {
  it("creates document clipboard data without resolving assets when none exist", async () => {
    const editor = editorFromMarkdown("Hello");
    const runtime = createBlockEditorRuntime();

    const data = await createClipboardDataFromDocument(editor, runtime.assets.resolve);

    expect(data).toEqual(
      expect.objectContaining({
        nodes: expect.any(Array),
        text: expect.stringContaining("Hello"),
      }),
    );
    expect(data?.html).toContain("Hello");
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
    expect(data?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: expect.arrayContaining([expect.objectContaining({ text: "Alpha " })]),
          type: "paragraph",
        }),
      ]),
    );
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
