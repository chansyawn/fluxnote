import { describe, expect, it } from "vite-plus/test";

import {
  editorFromMarkdown,
  expectEditorMarkdown,
  readMdast,
} from "../../test-helper/editor-driver";
import { pressTab, selectText } from "../../test-helper/interaction-driver";

describe("text", () => {
  it("inserts two spaces in a paragraph", () => {
    const editor = editorFromMarkdown("Alpha\n");

    selectText(editor, "Alpha", 2);
    expect(pressTab(editor)).toBe(true);

    expectEditorMarkdown(editor, "Al  pha");
  });

  it("does not handle Shift+Tab outside lists", () => {
    const editor = editorFromMarkdown("Alpha\n");

    selectText(editor, "Alpha", 2);
    expect(pressTab(editor, { shiftKey: true })).toBe(false);

    expectEditorMarkdown(editor, "Alpha");
  });

  it("does not handle Tab inside code blocks", () => {
    const editor = editorFromMarkdown(["```ts", "Alpha", "```", ""].join("\n"));

    selectText(editor, "Alpha", 2);
    pressTab(editor);

    expect(readMdast(editor).children[0]).toMatchObject({
      type: "code",
    });
    expect(readMdast(editor).children[0]).not.toMatchObject({ value: "Al  pha" });
  });

  it("does not handle Tab inside table cells", () => {
    const editor = editorFromMarkdown(["| A |", "| - |", ""].join("\n"));

    selectText(editor, "A", 1);
    pressTab(editor);

    const table = readMdast(editor).children[0];
    expect(table?.type).toBe("table");
    if (table?.type !== "table") {
      throw new Error("Expected a table.");
    }
    expect(table.children[0].children[0].children).toEqual([{ type: "text", value: "A" }]);
    expect(table.children[0].children[0].children).not.toEqual([{ type: "text", value: "A  " }]);
  });
});
