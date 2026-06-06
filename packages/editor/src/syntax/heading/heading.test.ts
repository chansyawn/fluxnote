import { describe, expect, it } from "vite-plus/test";

import {
  applyMarkdownShortcuts,
  editorFromMarkdown,
  editorFromMdast,
  readMarkdown,
  readMdast,
} from "../../test-helper/editor-driver";
import { pressBackspace, selectText } from "../../test-helper/interaction-driver";
import { doc, h, li, quote, t, ul } from "../../test-helper/mdast-builders";

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

  describe("keyboard commands", () => {
    it("Backspace at the start of a heading converts it to a paragraph", () => {
      const editor = editorFromMarkdown("# Title");

      selectText(editor, "Title", 0);
      expect(pressBackspace(editor)).toBe(true);

      expect(readMarkdown(editor).trim()).toBe("Title");
    });

    it("Backspace at the start of a heading inside a quote converts only the heading", () => {
      const editor = editorFromMdast(doc(quote(h(2, t("Quoted")))));

      selectText(editor, "Quoted", 0);
      expect(pressBackspace(editor)).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [{ children: [{ type: "text", value: "Quoted" }], type: "paragraph" }],
          type: "blockquote",
        },
      ]);
    });

    it("Backspace at the start of a heading inside a list item converts only the heading", () => {
      const editor = editorFromMdast(doc(ul(li([h(3, t("Listed"))]))));

      selectText(editor, "Listed", 0);
      expect(pressBackspace(editor)).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [
            {
              children: [
                { children: [], type: "paragraph" },
                { children: [{ type: "text", value: "Listed" }], type: "paragraph" },
              ],
              type: "listItem",
            },
          ],
          type: "list",
        },
      ]);
    });
  });
});
