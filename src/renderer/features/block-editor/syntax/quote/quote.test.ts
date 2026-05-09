import { describe, expect, it } from "vitest";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";
import { applyMarkdownShortcuts } from "../../test-helper/editor-driver";

describe("quote", () => {
  describe("structure round-trip", () => {
    it("preserves nested paragraphs inside a quote", () => {
      const markdown = ["> first", ">", "> second", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });

    it("preserves a list nested inside a quote", () => {
      const markdown = ["> - a", "> - b", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });
  });

  describe("markdown shortcuts", () => {
    it("`> ` produces a blockquote", () => {
      const result = applyMarkdownShortcuts("> quoted");
      expect(result.children[0]).toMatchObject({ type: "blockquote" });
    });
  });
});
