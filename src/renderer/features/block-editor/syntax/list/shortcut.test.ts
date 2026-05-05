import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../../test-helper/headless-editor-test-utils";

describe("list shortcut", () => {
  it("parses ordered and unordered list", () => {
    expect(parseMarkdownWithShortcuts("- Bullet").children[0]).toMatchObject({
      ordered: false,
      type: "list",
    });
    expect(parseMarkdownWithShortcuts("1. Ordered").children[0]).toMatchObject({
      ordered: true,
      type: "list",
    });
  });

  it("parses task list checked state", () => {
    expect(parseMarkdownWithShortcuts("- [x] Done").children[0]).toMatchObject({
      children: [expect.objectContaining({ checked: true })],
      type: "list",
    });
    expect(parseMarkdownWithShortcuts("- [ ] Todo").children[0]).toMatchObject({
      children: [expect.objectContaining({ checked: false })],
      type: "list",
    });
  });
});
