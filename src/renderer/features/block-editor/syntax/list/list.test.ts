import { $createListItemNode } from "@lexical/list";
import { $createLineBreakNode, $createTextNode } from "lexical";
import type { List, Root } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";
import {
  applyMarkdownShortcuts,
  createHeadlessEditor,
  editorFromMdast,
  editorFromMarkdown,
  readMarkdown,
  readMdast,
} from "../../test-helper/editor-driver";
import {
  pressBackspace,
  pressEnter,
  pressTab,
  selectEmptyParagraph,
  selectText,
} from "../../test-helper/interaction-driver";
import { doc, li, p, quote, t, ul } from "../../test-helper/mdast-builders";
import { isSingleParagraphListItem } from "./list-structure";

function getList(root: Root, index = 0): List {
  const child = root.children[index];
  expect(child?.type).toBe("list");
  return child as List;
}

describe("list", () => {
  describe("structure round-trip", () => {
    it("preserves multiple paragraphs in a single list item", () => {
      const markdown = ["- A", "", "  B", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);

      const list = getList(readMdast(editorFromMarkdown(markdown)));
      expect(list.children[0].children).toMatchObject([
        { children: [{ type: "text", value: "A" }], type: "paragraph" },
        { children: [{ type: "text", value: "B" }], type: "paragraph" },
      ]);
    });

    it("preserves a quote nested inside a list item", () => {
      const markdown = ["- A", "", "  > quote", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });

    it("preserves a fenced code block nested inside a list item", () => {
      const markdown = ["- A", "", "  ```ts", "  const a = 1;", "  ```", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });

    it("preserves nested sublists", () => {
      const markdown = ["- A", "  - B", "  - C", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
    });
  });

  describe("markdown shortcuts", () => {
    it("`- ` produces an unordered list", () => {
      const result = applyMarkdownShortcuts("- todo");
      expect(result.children[0]).toMatchObject({ ordered: false, type: "list" });
    });

    it("`1. ` produces an ordered list", () => {
      const result = applyMarkdownShortcuts("1. first");
      expect(result.children[0]).toMatchObject({ ordered: true, type: "list" });
    });

    it("`- [ ] ` produces an unchecked task item", () => {
      const result = applyMarkdownShortcuts("- [ ] todo");
      const list = result.children[0];
      expect(list.type).toBe("list");
      if (list.type === "list") {
        expect(list.children[0].checked).toBe(false);
      }
    });

    it("`- [x] ` produces a checked task item", () => {
      const result = applyMarkdownShortcuts("- [x] done");
      const list = result.children[0];
      if (list.type === "list") {
        expect(list.children[0].checked).toBe(true);
      }
    });
  });

  describe("structure helpers", () => {
    it("treats raw inline children as a single paragraph item", () => {
      const editor = createHeadlessEditor();
      let result = false;

      editor.update(
        () => {
          const listItem = $createListItemNode();
          listItem.append($createTextNode("A"), $createLineBreakNode(), $createTextNode("B"));
          result = isSingleParagraphListItem(listItem);
        },
        { discrete: true },
      );

      expect(result).toBe(true);
    });
  });

  describe("interactions", () => {
    it("Enter at the end of a paragraph creates the next list item", () => {
      const editor = editorFromMarkdown("- Alpha\n");

      selectText(editor, "Alpha");
      expect(pressEnter(editor)).toBe(true);

      const list = getList(readMdast(editor));
      expect(list.children).toMatchObject([
        {
          children: [{ children: [{ type: "text", value: "Alpha" }], type: "paragraph" }],
          type: "listItem",
        },
        {
          children: [{ children: [], type: "paragraph" }],
          type: "listItem",
        },
      ]);
    });

    it("Alt+Enter inserts a paragraph inside a simple list item", () => {
      const editor = editorFromMarkdown("- Alpha\n");

      selectText(editor, "Alpha");
      expect(pressEnter(editor, { altKey: true })).toBe(true);

      const list = getList(readMdast(editor));
      expect(list.children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "Alpha" }], type: "paragraph" },
            { children: [], type: "paragraph" },
          ],
          type: "listItem",
        },
      ]);
    });

    it("Enter on an empty nested item promotes it one list level", () => {
      const editor = editorFromMdast(doc(ul(li([p(t("Parent")), ul(li([p()]))]))));

      selectEmptyParagraph(editor);
      expect(pressEnter(editor)).toBe(true);

      const list = getList(readMdast(editor));
      expect(list.children).toMatchObject([
        {
          children: [{ children: [{ type: "text", value: "Parent" }], type: "paragraph" }],
          type: "listItem",
        },
        {
          children: [{ children: [], type: "paragraph" }],
          type: "listItem",
        },
      ]);
    });

    it("Backspace at the marker position merges into the previous item", () => {
      const editor = editorFromMarkdown("- Alpha\n- Beta\n");

      selectText(editor, "Beta", 0);
      expect(pressBackspace(editor)).toBe(true);

      const list = getList(readMdast(editor));
      expect(list.children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "Alpha" }], type: "paragraph" },
            { children: [{ type: "text", value: "Beta" }], type: "paragraph" },
          ],
          type: "listItem",
        },
      ]);
    });

    it("Tab nests the selected item under its previous sibling", () => {
      const editor = editorFromMarkdown("- Alpha\n- Beta\n");

      selectText(editor, "Beta", 0);
      expect(pressTab(editor)).toBe(true);

      const list = getList(readMdast(editor));
      expect(list.children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "Alpha" }], type: "paragraph" },
            {
              children: [
                {
                  children: [{ children: [{ type: "text", value: "Beta" }], type: "paragraph" }],
                  type: "listItem",
                },
              ],
              type: "list",
            },
          ],
          type: "listItem",
        },
      ]);
    });

    it("Shift+Tab unwraps a top-level item and keeps following items listed", () => {
      const editor = editorFromMarkdown("- Alpha\n- Beta\n- Gamma\n");

      selectText(editor, "Beta", 0);
      expect(pressTab(editor, { shiftKey: true })).toBe(true);

      expect(readMdast(editor).children).toMatchObject([
        {
          children: [
            {
              children: [{ children: [{ type: "text", value: "Alpha" }], type: "paragraph" }],
              type: "listItem",
            },
          ],
          type: "list",
        },
        { children: [{ type: "text", value: "Beta" }], type: "paragraph" },
        {
          children: [
            {
              children: [{ children: [{ type: "text", value: "Gamma" }], type: "paragraph" }],
              type: "listItem",
            },
          ],
          type: "list",
        },
      ]);
    });

    it("Backspace at a nested quote start collapses the quote before list merging", () => {
      const editor = editorFromMdast(doc(ul(li([p(t("Lead")), quote(p(t("Quoted")))]))));

      selectText(editor, "Quoted", 0);
      expect(pressBackspace(editor)).toBe(true);

      const list = getList(readMdast(editor));
      expect(list.children).toMatchObject([
        {
          children: [
            { children: [{ type: "text", value: "Lead" }], type: "paragraph" },
            { children: [{ type: "text", value: "Quoted" }], type: "paragraph" },
          ],
          type: "listItem",
        },
      ]);

      const savedMarkdown = readMarkdown(editor);
      expect(savedMarkdown).toContain("\n\n");
      const reopenedList = getList(readMdast(editorFromMarkdown(savedMarkdown)));
      expect(reopenedList.children[0].children).toMatchObject([
        { children: [{ type: "text", value: "Lead" }], type: "paragraph" },
        { children: [{ type: "text", value: "Quoted" }], type: "paragraph" },
      ]);
    });
  });

  describe("checked state", () => {
    it("preserves mixed checked/unchecked items", () => {
      const editor = editorFromMarkdown("- [x] done\n- [ ] todo\n");
      const mdast = readMdast(editor);
      const list = mdast.children[0];
      if (list.type === "list") {
        expect(list.children[0].checked).toBe(true);
        expect(list.children[1].checked).toBe(false);
      }
    });
  });
});
