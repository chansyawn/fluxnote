import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("thematic break syntax", () => {
  it("round trips horizontal rules", () => {
    const output = roundTripMarkdown("Before\n\n---\n\nAfter");

    expect(output).toContain("---");
  });
});
