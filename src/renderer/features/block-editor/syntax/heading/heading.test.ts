import { describe, expect, it } from "vite-plus/test";

import { applyMarkdownShortcuts } from "../../test-helper/editor-driver";

describe("heading", () => {
  describe("markdown shortcuts", () => {
    it("`# ` produces an h1", () => {
      const result = applyMarkdownShortcuts("# title");
      expect(result.children[0]).toMatchObject({ depth: 1, type: "heading" });
    });

    it("`### ` produces an h3", () => {
      const result = applyMarkdownShortcuts("### sub");
      expect(result.children[0]).toMatchObject({ depth: 3, type: "heading" });
    });
  });
});
