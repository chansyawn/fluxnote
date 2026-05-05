import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../test-helper/headless-editor-test-utils";

describe("markdown shortcuts", () => {
  it("parses mixed block shortcuts in one document", () => {
    const semantic = parseMarkdownWithShortcuts(
      ["# Heading", "", "> Quote", "", "- Bullet", "", "```", "code", "```", "", "---"].join("\n"),
    );

    expect(semantic.children[0]).toMatchObject({
      depth: 1,
      type: "heading",
    });
    expect(semantic.children[1]).toEqual({
      children: [
        {
          children: [{ type: "text", value: "Quote" }],
          type: "paragraph",
        },
      ],
      type: "blockquote",
    });
    expect(semantic.children[2]).toMatchObject({
      ordered: false,
      type: "list",
    });
    expect(semantic.children[3]).toMatchObject({
      type: "codeBlock",
      value: "code",
    });
    expect(semantic.children[4]).toMatchObject({ type: "thematicBreak" });
  });
});
