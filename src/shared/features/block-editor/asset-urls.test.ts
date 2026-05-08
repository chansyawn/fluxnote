import { describe, expect, it } from "vite-plus/test";

import { collectImageAssetUrls, rewriteClipboardImageAssetUrls } from "./asset-urls";
import type { ClipboardSerializedNode } from "./clipboard";

describe("block editor asset urls", () => {
  it("collects nested image asset urls", () => {
    const nodes = [
      {
        children: [
          { src: "assets://block/a.png", type: "image", version: 1 },
          { text: "assets://block/text.png", type: "text", version: 1 },
          { src: "https://example.com/b.png", type: "image", version: 1 },
          { url: "assets://block/c.png", type: "image" },
        ],
        type: "paragraph",
      },
    ];

    expect(collectImageAssetUrls(nodes)).toEqual(["assets://block/a.png", "assets://block/c.png"]);
  });

  it("rewrites clipboard image asset urls without mutating source nodes", () => {
    const nodes: ClipboardSerializedNode[] = [
      {
        children: [
          { src: "assets://source/a.png", type: "image", version: 1 },
          { text: " untouched ", type: "text", version: 1 },
          { src: "https://example.com/b.png", type: "image", version: 1 },
        ],
        type: "paragraph",
        version: 1,
      },
    ];

    const result = rewriteClipboardImageAssetUrls(
      nodes,
      new Map([["assets://source/a.png", "assets://target/a.png"]]),
    );

    expect(result).toEqual([
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
});
