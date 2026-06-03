import { describe, expect, it } from "vite-plus/test";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";
import { applyMarkdownShortcuts } from "../../test-helper/editor-driver";

describe("code", () => {
  describe("round-trip", () => {
    it("preserves a fenced code block with language", () => {
      const markdown = ["```ts", "const x = 1;", "```", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });

    it("preserves a fenced code block without language", () => {
      const markdown = ["```", "plain text", "```", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });
  });

  describe("markdown shortcuts", () => {
    it("``` ` ``` produces a code block", () => {
      const result = applyMarkdownShortcuts("```\nhi\n```");
      expect(result.children[0]).toMatchObject({ type: "code" });
    });
  });
});
