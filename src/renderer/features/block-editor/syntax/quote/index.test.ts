import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("quote syntax", () => {
  it("round trips blockquotes", () => {
    const output = roundTripMarkdown("> Quoted text");

    expect(output).toContain("> Quoted text");
  });
});
