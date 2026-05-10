import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";
import { describe, expect, it } from "vite-plus/test";

import { exportClipboardNodesToMarkdown, rewriteClipboardHtmlAssetUrls } from "./clipboard-formats";

function textNode(text: string): ClipboardSerializedNode {
  return {
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    type: "text",
    version: 1,
  };
}

describe("clipboard formats", () => {
  it("exports inline clipboard nodes as markdown paragraphs", () => {
    const markdown = exportClipboardNodesToMarkdown([textNode("hello")]);

    expect(markdown.trim()).toBe("hello");
  });

  it("rewrites image src attributes without touching other html", () => {
    const html = [
      '<p><img src="assets://block/photo.png" alt="Photo"></p>',
      "<img src='assets://block/other.png'>",
      '<a href="assets://block/photo.png">asset link</a>',
    ].join("");

    const rewrittenHtml = rewriteClipboardHtmlAssetUrls(
      html,
      new Map([["assets://block/photo.png", "file:///tmp/photo.png"]]),
    );

    expect(rewrittenHtml).toContain('<img src="file:///tmp/photo.png" alt="Photo">');
    expect(rewrittenHtml).toContain("<img src='assets://block/other.png'>");
    expect(rewrittenHtml).toContain('<a href="assets://block/photo.png">asset link</a>');
  });
});
