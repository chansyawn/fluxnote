import type { BlockEditorClipboardPayload } from "@shared/features/block-editor/clipboard";
import { describe, expect, it, vi } from "vite-plus/test";

import { createNodesForTargetBlock } from "./clipboard-assets";

describe("clipboard assets", () => {
  it("returns copied nodes without invoking asset copy when there are no asset urls", async () => {
    const payload: BlockEditorClipboardPayload = {
      nodes: [{ text: "Text", type: "text", version: 1 }],
      sourceBlockId: "source-block",
    };
    const copyAssets = vi.fn(async () => ({ assets: [] }));

    const nodes = await createNodesForTargetBlock(payload, copyAssets);

    expect(nodes).toEqual(payload.nodes);
    expect(nodes).not.toBe(payload.nodes);
    expect(copyAssets).not.toHaveBeenCalled();
  });

  it("copies image assets into the target block and rewrites node urls", async () => {
    const payload: BlockEditorClipboardPayload = {
      nodes: [
        {
          children: [
            {
              alt: "Photo",
              src: "assets://source/photo.png",
              title: null,
              type: "image",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
      ],
      sourceBlockId: "source-block",
    };
    const copyAssets = vi.fn(async () => ({
      assets: [
        {
          assetUrl: "assets://target/photo.png",
          sourceAssetUrl: "assets://source/photo.png",
        },
      ],
    }));

    const nodes = await createNodesForTargetBlock(payload, copyAssets);

    expect(copyAssets).toHaveBeenCalledWith({
      assetUrls: ["assets://source/photo.png"],
      sourceBlockId: "source-block",
    });
    expect(nodes[0]?.children?.[0]?.src).toBe("assets://target/photo.png");
    expect(payload.nodes[0]?.children?.[0]?.src).toBe("assets://source/photo.png");
  });
});
