import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../../test-helper/headless-editor-test-utils";

describe("image shortcut", () => {
  it("creates inline image from markdown image syntax", () => {
    const semantic = parseMarkdownWithShortcuts(
      'Before ![Alt text](https://example.com/image.png "Preview") after',
    );

    expect(semantic.children[0]).toEqual({
      children: [
        { type: "text", value: "Before " },
        {
          alt: "Alt text",
          title: "Preview",
          type: "image",
          url: "https://example.com/image.png",
        },
        { type: "text", value: " after" },
      ],
      type: "paragraph",
    });
  });
});
