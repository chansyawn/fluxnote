import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("emphasis syntax", () => {
  it("round trips text formats", () => {
    const output = roundTripMarkdown("This is **bold**, *italic*, ~~deleted~~, and `code`.");

    expect(output).toContain("**bold**");
    expect(output).toContain("*italic*");
    expect(output).toContain("~~deleted~~");
    expect(output).toContain("`code`");
  });
});
