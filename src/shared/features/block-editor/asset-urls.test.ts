import { describe, expect, it } from "vite-plus/test";

import { collectImageAssetUrls } from "./asset-urls";

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
});
