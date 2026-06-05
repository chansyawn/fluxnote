import { describe, expect, it } from "vite-plus/test";

import { collectImageAssetUrls } from "./asset-urls";
import {
  collectMarkdownImageAssetUrls,
  replaceMarkdownImageAssetUrls,
} from "./markdown-asset-urls";

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

  it("collects markdown image asset urls without literal or remote urls", () => {
    const content = [
      "Literal assets://block/text.png",
      "",
      "![Local](assets://block/local.png)",
      "",
      "![Remote](https://example.com/remote.png)",
    ].join("\n");

    expect(collectMarkdownImageAssetUrls(content)).toEqual(["assets://block/local.png"]);
  });

  it("replaces markdown image asset destinations", () => {
    const content = ["![One](assets://block/photo.png)", "![Two](assets://block/photo.png)"].join(
      "\n",
    );
    const assetUrlMap = new Map([["assets://block/photo.png", "file:///tmp/block/photo.png"]]);

    expect(replaceMarkdownImageAssetUrls(content, assetUrlMap)).toBe(
      ["![One](file:///tmp/block/photo.png)", "![Two](file:///tmp/block/photo.png)"].join("\n"),
    );
  });

  it("replaces markdown image destinations without changing matching alt text", () => {
    const assetUrl = "assets://block/photo.png";
    const content = [`![${assetUrl}](${assetUrl})`, `![${assetUrl}](${assetUrl} "Preview")`].join(
      "\n",
    );
    const assetUrlMap = new Map([[assetUrl, "file:///tmp/block/photo.png"]]);

    expect(replaceMarkdownImageAssetUrls(content, assetUrlMap)).toBe(
      [
        `![${assetUrl}](file:///tmp/block/photo.png)`,
        `![${assetUrl}](file:///tmp/block/photo.png "Preview")`,
      ].join("\n"),
    );
  });

  it("leaves markdown unchanged when no replacement exists", () => {
    const content = "![Local](assets://block/local.png)";

    expect(replaceMarkdownImageAssetUrls(content, new Map())).toBe(content);
  });
});
