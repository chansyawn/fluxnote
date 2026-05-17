import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, readMdast } from "../../test-helper/editor-driver";
import { pressTab, selectText } from "../../test-helper/interaction-driver";

describe("text", () => {
  it("inserts two spaces in a paragraph", () => {
    const editor = editorFromMarkdown("Alpha\n");

    selectText(editor, "Alpha", 2);
    expect(pressTab(editor)).toBe(true);

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [{ type: "text", value: "Al  pha" }],
      type: "paragraph",
    });
  });

  it("inserts two spaces in heading text", () => {
    const editor = editorFromMarkdown("# Alpha\n");

    selectText(editor, "Alpha", 2);
    expect(pressTab(editor)).toBe(true);

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [{ type: "text", value: "Al  pha" }],
      depth: 1,
      type: "heading",
    });
  });

  it("inserts two spaces in quote text", () => {
    const editor = editorFromMarkdown("> Alpha\n");

    selectText(editor, "Alpha", 2);
    expect(pressTab(editor)).toBe(true);

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [
        {
          children: [{ type: "text", value: "Al  pha" }],
          type: "paragraph",
        },
      ],
      type: "blockquote",
    });
  });

  it("does not handle Shift+Tab outside lists", () => {
    const editor = editorFromMarkdown("Alpha\n");

    selectText(editor, "Alpha", 2);
    expect(pressTab(editor, { shiftKey: true })).toBe(false);

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [{ type: "text", value: "Alpha" }],
      type: "paragraph",
    });
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

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [
        {
          children: [{ children: [{ type: "text", value: "A" }], type: "tableCell" }],
          type: "tableRow",
        },
      ],
      type: "table",
    });
  });
});
