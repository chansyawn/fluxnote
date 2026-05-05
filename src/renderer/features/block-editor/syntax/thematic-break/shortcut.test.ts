import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownWithShortcuts } from "../../test-helper/headless-editor-test-utils";

describe("thematic break shortcut", () => {
  it("parses thematic break", () => {
    expect(parseMarkdownWithShortcuts("---").children[0]).toMatchObject({ type: "thematicBreak" });
  });
});
