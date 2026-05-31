// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import {
  ASSET_UNAVAILABLE_MARKDOWN,
  collectDataImageUrlsFromClipboardFormats,
  collectMarkdownAssetUrls,
  collectFileUrlsFromClipboardFormats,
  getImageFileUrlForNativeClipboard,
  parseDataImageUrl,
  rewriteClipboardAssetUrlsToFiles,
  rewriteClipboardDataImageUrlsToAssets,
  rewriteClipboardFileUrlsToAssets,
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
    ).toBe('<img src="file:///tmp/photo.png"><a href="assets://block/diagram.svg"></a>');
  });

  it("rewrites clipboard asset image URLs to file URLs and placeholders", () => {
    const result = rewriteClipboardAssetUrlsToFiles(
      {
        html: '<img src="assets://block/photo.png"><img src="assets://block/missing.png">',
        text: "![Photo](assets://block/photo.png)\n![Missing](assets://block/missing.png)",
      },
      new Map([["assets://block/photo.png", "file:///tmp/photo.png"]]),
    );

    expect(result.html).toContain('src="file:///tmp/photo.png"');
    expect(result.html).toContain('alt="Asset unavailable"');
    expect(result.text).toContain("![Photo](file:///tmp/photo.png)");
    expect(result.text).toContain(ASSET_UNAVAILABLE_MARKDOWN);
  });

  it("rewrites pasted file image URLs to asset URLs and placeholders", () => {
    const result = rewriteClipboardFileUrlsToAssets(
      {
        html: '<img src="file:///tmp/photo.png"><img src="file:///tmp/missing.png">',
        text: "![Photo](file:///tmp/photo.png)\n![Missing](file:///tmp/missing.png)",
      },
      new Map([
        ["file:///tmp/photo.png", "assets://block/photo.png"],
        ["file:///tmp/missing.png", null],
      ]),
    );

    expect(result.html).toContain('src="assets://block/photo.png"');
    expect(result.html).toContain('alt="Asset unavailable"');
    expect(result.text).toContain("![Photo](assets://block/photo.png)");
    expect(result.text).toContain(ASSET_UNAVAILABLE_MARKDOWN);
  });

  it("collects file image URLs from clipboard formats", () => {
    expect(
      collectFileUrlsFromClipboardFormats(
        '<img src="file:///tmp/photo.png">',
        "![Other](file:///tmp/other.png)",
      ),
    ).toEqual(["file:///tmp/photo.png", "file:///tmp/other.png"]);
  });

  it("collects supported data image URLs from clipboard formats", () => {
    const pngDataUrl = "data:image/png;base64,AQID";
    const gifDataUrl = "data:image/gif;base64,BAUG";

    expect(
      collectDataImageUrlsFromClipboardFormats(
        `<img src="${pngDataUrl}"><img src="data:image/svg+xml;base64,PHN2Zz4=">`,
        `![Gif](${gifDataUrl})`,
      ),
    ).toEqual([pngDataUrl, gifDataUrl]);
  });

  it("parses supported data image URLs and rejects unsupported image types", () => {
    expect(parseDataImageUrl("data:image/webp;base64,AQID")).toEqual({
      dataBase64: "AQID",
      mimeType: "image/webp",
    });
    expect(parseDataImageUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
  });

  it("rewrites pasted data image URLs to asset URLs and placeholders", () => {
    const dataUrl = "data:image/png;base64,AQID";
    const missingDataUrl = "data:image/jpeg;base64,BAUG";
    const unsupportedDataUrl = "data:image/svg+xml;base64,PHN2Zz4=";
    const result = rewriteClipboardDataImageUrlsToAssets(
      {
        html: `<img src="${dataUrl}"><img src="${missingDataUrl}"><img src="${unsupportedDataUrl}">`,
        text: `![Photo](${dataUrl})\n![Missing](${missingDataUrl})\n![Svg](${unsupportedDataUrl})`,
      },
      new Map([
        [dataUrl, "assets://block/photo.png"],
        [missingDataUrl, null],
      ]),
    );

    expect(result.html).toContain('src="assets://block/photo.png"');
    expect(result.html).toContain('alt="Asset unavailable"');
    expect(result.text).toContain("![Photo](assets://block/photo.png)");
    expect(result.text).toContain(ASSET_UNAVAILABLE_MARKDOWN);
    expect(result.text).not.toContain(unsupportedDataUrl);
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
