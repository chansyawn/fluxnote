import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("link syntax", () => {
  it("round trips links", () => {
    const output = roundTripMarkdown('[Flux](https://example.com "Example")');

    expect(output).toContain('[Flux](https://example.com "Example")');
  });
});
