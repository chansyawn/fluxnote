import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("heading syntax", () => {
  it("round trips heading depth", () => {
    const output = roundTripMarkdown("# One\n\n### Three");

    expect(output).toContain("# One");
    expect(output).toContain("### Three");
  });
});
