import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";

describe("code syntax", () => {
  it("round trips fenced code blocks", () => {
    const output = roundTripMarkdown("```ts\ntype Id = string;\n```");

    expect(output).toContain("```ts");
    expect(output).toContain("type Id = string;");
  });
});
