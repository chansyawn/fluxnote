import type { RootContent } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { isFlowBlockContent, isPhrasingContent } from "./mdast-utils";

describe("mdast semantic utilities", () => {
  it("does not classify phrasing nodes as flow block content", () => {
    const inlineNodes = [
      { type: "text", value: "text" },
      { children: [{ type: "text", value: "em" }], type: "emphasis" },
      { children: [{ type: "text", value: "strong" }], type: "strong" },
      { type: "inlineCode", value: "code" },
      {
        children: [{ type: "text", value: "link" }],
        title: null,
        type: "link",
        url: "https://example.com",
      },
      { alt: "alt", title: null, type: "image", url: "https://example.com/image.png" },
    ] as RootContent[];

    for (const node of inlineNodes) {
      expect(isFlowBlockContent(node)).toBe(false);
      expect(isPhrasingContent(node)).toBe(true);
    }
  });
});
