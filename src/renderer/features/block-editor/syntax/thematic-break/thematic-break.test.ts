import { describe, expect, it } from "vitest";

import { applyMarkdownShortcuts } from "../../test-helper/editor-driver";

describe("thematic break", () => {
  it("`---` produces a thematic break", () => {
    const result = applyMarkdownShortcuts("---");
    expect(result.children[0]).toMatchObject({ type: "thematicBreak" });
  });
});
