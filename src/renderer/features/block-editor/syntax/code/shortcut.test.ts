import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../../test-helper/headless-editor-test-utils";

describe("code shortcut", () => {
  it("parses fenced code block", () => {
    expect(parseMarkdownWithShortcuts("```\ncode\n```").children[0]).toMatchObject({
      type: "codeBlock",
      value: "code",
    });
  });
});
