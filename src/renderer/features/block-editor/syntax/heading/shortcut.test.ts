import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../../test-helper/headless-editor-test-utils";

describe("heading shortcut", () => {
  it("parses heading depth", () => {
    expect(parseMarkdownWithShortcuts("# Heading").children[0]).toMatchObject({
      depth: 1,
      type: "heading",
    });
    expect(parseMarkdownWithShortcuts("## Heading").children[0]).toMatchObject({
      depth: 2,
      type: "heading",
    });
  });
});
