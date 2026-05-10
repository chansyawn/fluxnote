import { $createListItemNode } from "@lexical/list";
import { $createLineBreakNode, $createTextNode } from "lexical";
import { describe, expect, it } from "vitest";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";
import {
  applyMarkdownShortcuts,
  createHeadlessEditor,
  readMdast,
} from "../../test-helper/editor-driver";
import { editorFromMarkdown } from "../../test-helper/editor-driver";
import { isSingleParagraphListItem } from "./list-structure";

describe("list", () => {
  describe("structure round-trip", () => {
    it("preserves multiple paragraphs in a single list item", () => {
      const markdown = ["- A", "", "  B", ""].join("\n");
      expectMarkdownRoundTripStable(markdown);
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
