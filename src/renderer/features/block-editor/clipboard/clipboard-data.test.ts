import { describe, expect, it } from "vite-plus/test";

import {
  collectMarkdownAssetUrls,
  getImageFileUrlForNativeClipboard,
  rewriteHtmlAssetUrls,
} from "./clipboard-data";

describe("clipboard data helpers", () => {
  it("collects unique asset image URLs from Markdown", () => {
    const markdown = [
      "![One](assets://block/photo.png)",
      "![Duplicate](assets://block/photo.png)",
      '![Two](<assets://block/diagram.svg> "Diagram")',
      "![Remote](https://example.com/photo.png)",
    ].join("\n");

    expect(collectMarkdownAssetUrls(markdown)).toEqual([
      "assets://block/photo.png",
      "assets://block/diagram.svg",
    ]);
  });

  it("rewrites asset URLs in HTML with resolved file URLs", () => {
    const assetUrlMap = new Map([
      ["assets://block/photo.png", "file:///tmp/photo.png"],
      ["assets://block/diagram.svg", "file:///tmp/diagram.svg"],
    ]);

    expect(
      rewriteHtmlAssetUrls(
        '<img src="assets://block/photo.png"><a href="assets://block/diagram.svg">',
        assetUrlMap,
      ),
    ).toBe('<img src="file:///tmp/photo.png"><a href="file:///tmp/diagram.svg">');
  });

  it("returns a native image file URL only when exactly one Markdown image asset resolves", () => {
    const assetUrlMap = new Map([["assets://block/photo.png", "file:///tmp/photo.png"]]);

    expect(getImageFileUrlForNativeClipboard("![One](assets://block/photo.png)", assetUrlMap)).toBe(
      "file:///tmp/photo.png",
    );
    expect(
      getImageFileUrlForNativeClipboard(
        "![One](assets://block/photo.png)\n![Two](assets://block/diagram.svg)",
        assetUrlMap,
      ),
    ).toBeUndefined();
    expect(getImageFileUrlForNativeClipboard("Plain text", assetUrlMap)).toBeUndefined();
  });
});
