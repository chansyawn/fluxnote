import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../../test-helper/headless-editor-test-utils";

describe("quote shortcut", () => {
  it("parses blockquote", () => {
    expect(parseMarkdownWithShortcuts("> Quote").children[0]).toEqual({
      children: [
        {
          children: [{ type: "text", value: "Quote" }],
          type: "paragraph",
        },
      ],
      type: "blockquote",
    });
  });
});
