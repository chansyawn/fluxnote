import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("paragraph syntax", () => {
  it("round trips paragraphs and hard breaks", () => {
    const output = roundTripMarkdown("Alpha  \nBravo\n\nCharlie");

    expect(output).toContain("Alpha\\\nBravo");
    expect(output).toContain("Charlie");
  });
});
