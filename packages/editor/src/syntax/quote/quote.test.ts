import type { Blockquote, Root } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";
import {
  applyMarkdownShortcuts,
  editorFromMdast,
  readMdast,
} from "../../test-helper/editor-driver";
import {
  pressBackspace,
  pressEnter,
  selectEmptyParagraph,
  selectText,
} from "../../test-helper/interaction-driver";
import { doc, li, p, quote, t, ul } from "../../test-helper/mdast-builders";

function getQuote(root: Root, index = 0): Blockquote {
  const child = root.children[index];
  expect(child?.type).toBe("blockquote");
  return child as Blockquote;
}

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

  describe("interactions", () => {
    it("Enter on an empty final paragraph exits the quote", () => {
      const editor = editorFromMdast(doc(quote(p(t("Quoted")), p())));

      selectEmptyParagraph(editor);
      expect(pressEnter(editor)).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [{ children: [{ type: "text", value: "Quoted" }], type: "paragraph" }],
          type: "blockquote",
        },
        { children: [], type: "paragraph" },
      ]);
    });

    it("Enter on an otherwise empty quote replaces it with a paragraph", () => {
      const editor = editorFromMdast(doc(quote(p())));

      selectEmptyParagraph(editor);
      expect(pressEnter(editor)).toBe(true);

      expect(readMdast(editor).children).toMatchObject([{ children: [], type: "paragraph" }]);
    });

    it("Enter on a non-empty quote line continues the quote", () => {
      const editor = editorFromMdast(doc(quote(p(t("Quoted")))));

      selectText(editor, "Quoted");
      expect(pressEnter(editor)).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "Quoted" }], type: "paragraph" },
            { children: [], type: "paragraph" },
          ],
          type: "blockquote",
        },
      ]);
    });

    it("Alt+Enter at the start of a quote creates a paragraph before it", () => {
      const editor = editorFromMdast(doc(quote(p(t("Quoted")))));

      selectText(editor, "Quoted", 0);
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        { children: [], type: "paragraph" },
        {
          children: [{ children: [{ type: "text", value: "Quoted" }], type: "paragraph" }],
          type: "blockquote",
        },
      ]);
    });

    it("Alt+Enter at the end of a quote creates a paragraph after it", () => {
      const editor = editorFromMdast(doc(quote(p(t("Quoted")))));

      selectText(editor, "Quoted");
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [{ children: [{ type: "text", value: "Quoted" }], type: "paragraph" }],
          type: "blockquote",
        },
        { children: [], type: "paragraph" },
      ]);
    });

    it("Alt+Enter in the middle of a quote splits it into two quotes", () => {
      const editor = editorFromMdast(doc(quote(p(t("FirstSecond")))));

      selectText(editor, "FirstSecond", "First".length);
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [{ children: [{ type: "text", value: "First" }], type: "paragraph" }],
          type: "blockquote",
        },
        {
          children: [{ children: [{ type: "text", value: "Second" }], type: "paragraph" }],
          type: "blockquote",
        },
      ]);
    });

    it("Alt+Enter between quote paragraphs splits them into two quotes", () => {
      const editor = editorFromMdast(doc(quote(p(t("First")), p(t("Second")))));

      selectText(editor, "Second", 0);
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "First" }], type: "paragraph" },
            { children: [], type: "paragraph" },
          ],
          type: "blockquote",
        },
        {
          children: [{ children: [{ type: "text", value: "Second" }], type: "paragraph" }],
          type: "blockquote",
        },
      ]);
    });

    it("Alt+Enter on an empty final paragraph exits the quote and keeps the empty line", () => {
      const editor = editorFromMdast(doc(quote(p(t("Quoted")), p())));

      selectEmptyParagraph(editor);
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "Quoted" }], type: "paragraph" },
            { children: [], type: "paragraph" },
          ],
          type: "blockquote",
        },
        { children: [], type: "paragraph" },
      ]);
    });

    it("Alt+Enter on an empty quote creates a paragraph after it", () => {
      const editor = editorFromMdast(doc(quote(p())));

      selectEmptyParagraph(editor);
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [{ children: [], type: "paragraph" }],
          type: "blockquote",
        },
        { children: [], type: "paragraph" },
      ]);
    });

    it("Alt+Enter inside a structured child does not split the outer quote", () => {
      const editor = editorFromMdast(doc(quote(ul(li([p(t("ItemText"))])))));

      selectText(editor, "ItemText", "Item".length);
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [
            {
              children: [
                {
                  children: [
                    { children: [{ type: "text", value: "Item" }], type: "paragraph" },
                    { children: [{ type: "text", value: "Text" }], type: "paragraph" },
                  ],
                  type: "listItem",
                },
              ],
              type: "list",
            },
          ],
          type: "blockquote",
        },
      ]);
    });

    it("Backspace at the start of the first child unwraps the quote", () => {
      const editor = editorFromMdast(doc(quote(p(t("First")), p(t("Second")))));

      selectText(editor, "First", 0);
      expect(pressBackspace(editor)).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        { children: [{ type: "text", value: "First" }], type: "paragraph" },
        { children: [{ type: "text", value: "Second" }], type: "paragraph" },
      ]);
    });

    it("Backspace at a list marker inside a quote unwraps that list item inside the quote", () => {
      const editor = editorFromMdast(doc(quote(ul(li([p(t("Item"))])))));

      selectText(editor, "Item", 0);
      expect(pressBackspace(editor)).toBe(true);

      expect(getQuote(readMdast(editor)).children).toMatchObject([
        { children: [{ type: "text", value: "Item" }], type: "paragraph" },
      ]);
    });
  });
});
