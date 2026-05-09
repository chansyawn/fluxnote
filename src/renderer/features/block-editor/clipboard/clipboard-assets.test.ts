import { describe, expect, it, vi } from "vite-plus/test";

import { createNodesForTargetBlock, rewriteClipboardAssetUrls } from "./clipboard-assets";

describe("block editor clipboard assets", () => {
  it("rewrites nested image node urls for internal clipboard paste", () => {
    const nodes = [
      {
        children: [
          { alt: "A", src: "assets://source/a.png", title: null, type: "image", version: 1 },
          { text: " untouched ", type: "text", version: 1 },
          { alt: "B", src: "https://example.com/b.png", title: null, type: "image", version: 1 },
        ],
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        type: "paragraph",
        version: 1,
      },
    ];

    expect(
      rewriteClipboardAssetUrls(
        nodes,
        new Map([["assets://source/a.png", "assets://target/a.png"]]),
      ),
    ).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({ src: "assets://target/a.png" }),
          expect.objectContaining({ text: " untouched " }),
          expect.objectContaining({ src: "https://example.com/b.png" }),
        ],
      }),
    ]);
    expect(nodes[0]?.children?.[0]?.src).toBe("assets://source/a.png");
  });

  it("copies internal asset urls through the injected runtime", async () => {
    const copyAssets = vi.fn(async () => ({
      assets: [
        {
          assetUrl: "assets://target/a.png",
          sourceAssetUrl: "assets://source/a.png",
        },
      ],
    }));

    const nodes = await createNodesForTargetBlock(
      {
        nodes: [{ alt: "A", src: "assets://source/a.png", title: null, type: "image", version: 1 }],
        sourceBlockId: "source-block",
      },
      copyAssets,
    );

    expect(copyAssets).toHaveBeenCalledWith({
      assetUrls: ["assets://source/a.png"],
      sourceBlockId: "source-block",
    });
    expect(nodes).toEqual([
      expect.objectContaining({
        src: "assets://target/a.png",
      }),
    ]);
  });
});
