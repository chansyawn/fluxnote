import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("list syntax", () => {
  it("round trips ordered, unordered, and task lists", () => {
    const output = roundTripMarkdown(
      ["- Alpha", "- Beta", "", "1. One", "2. Two", "", "- [x] Done"].join("\n"),
    );

    expect(output).toContain("- Alpha");
    expect(output).toContain("1. One");
    expect(output).toContain("- [x] Done");
  });
});
