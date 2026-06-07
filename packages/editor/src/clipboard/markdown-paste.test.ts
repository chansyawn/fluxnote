import { $getRoot, $getSelection } from "lexical";
import type { List, Root } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, readMarkdown, readMdast } from "../test-helper/editor-driver";
import { selectText } from "../test-helper/interaction-driver";
import { insertMarkdownAtSelection } from "./markdown-paste";

function selectionFrom(editor: ReturnType<typeof editorFromMarkdown>) {
  return editor.read(() => $getSelection()?.clone() ?? null);
}

function firstList(root: Root): List {
  const list = root.children.find((child): child is List => child.type === "list");
  if (!list) {
    throw new Error("Expected editor content to include a list.");
  }
  return list;
}

describe("insertMarkdownAtSelection", () => {
  it("parses heading markdown into a heading block", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(editor, "# Title", selectionFrom(editor));

    expect(readMarkdown(editor).trim()).toBe("# Title");
  });

  it("parses list markdown into list items", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(editor, "- one\n- two\n- three", selectionFrom(editor));

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("- one");
    expect(markdown).toContain("- two");
    expect(markdown).toContain("- three");
  });

  it("preserves nested list items after a sibling list item", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(
      editor,
      ["- Unordered item", "", "- Nested group", "", "  - Nested item A", "  - Nested item B"].join(
        "\n",
      ),
      selectionFrom(editor),
    );

    expect(firstList(readMdast(editor))).toMatchObject({
      children: [
        {
          children: [{ children: [{ type: "text", value: "Unordered item" }], type: "paragraph" }],
          type: "listItem",
        },
        {
          children: [
            { children: [{ type: "text", value: "Nested group" }], type: "paragraph" },
            {
              children: [
                {
                  children: [
                    { children: [{ type: "text", value: "Nested item A" }], type: "paragraph" },
                  ],
                  type: "listItem",
                },
                {
                  children: [
                    { children: [{ type: "text", value: "Nested item B" }], type: "paragraph" },
                  ],
                  type: "listItem",
                },
              ],
              type: "list",
            },
          ],
          type: "listItem",
        },
      ],
      type: "list",
    });
    expect(readMarkdown(editor)).not.toContain("\n- \n");
  });

  it("preserves a top-level list item that owns a nested list", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(
      editor,
      ["- Nested group", "", "  - Nested item A", "  - Nested item B"].join("\n"),
      selectionFrom(editor),
    );

    expect(firstList(readMdast(editor))).toMatchObject({
      children: [
        {
          children: [
            { children: [{ type: "text", value: "Nested group" }], type: "paragraph" },
            {
              children: [
                {
                  children: [
                    { children: [{ type: "text", value: "Nested item A" }], type: "paragraph" },
                  ],
                  type: "listItem",
                },
                {
                  children: [
                    { children: [{ type: "text", value: "Nested item B" }], type: "paragraph" },
                  ],
                  type: "listItem",
                },
              ],
              type: "list",
            },
          ],
          type: "listItem",
        },
      ],
      type: "list",
    });
    expect(readMarkdown(editor)).toContain("- Nested group");
    expect(readMarkdown(editor)).toContain("  - Nested item A");
    expect(readMarkdown(editor)).toContain("  - Nested item B");
  });

  it("parses blockquote markdown into a blockquote", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(editor, "> quoted", selectionFrom(editor));

    expect(readMarkdown(editor)).toContain("> quoted");
  });

  it("parses fenced code blocks", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(editor, "```ts\nconst x = 1;\n```", selectionFrom(editor));

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("```ts");
    expect(markdown).toContain("const x = 1;");
  });

  it("parses gfm tables", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(
      editor,
      ["| h1 | h2 |", "| -- | -- |", "| a  | b  |"].join("\n"),
      selectionFrom(editor),
    );

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("| h1 | h2 |");
    expect(markdown).toContain("| a  | b  |");
  });

  it("inserts multi-block markdown alongside existing content", () => {
    const editor = editorFromMarkdown("Hello world");
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      { discrete: true },
    );

    insertMarkdownAtSelection(editor, "para one\n\n## A heading", selectionFrom(editor));

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("Hello world");
    expect(markdown).toContain("para one");
    expect(markdown).toContain("## A heading");
  });

  it("appends to the root when no selection is provided", () => {
    const editor = editorFromMarkdown("Existing");

    insertMarkdownAtSelection(editor, "Appended", null);

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("Existing");
    expect(markdown).toContain("Appended");
  });

  it("does nothing when the markdown is empty", () => {
    const editor = editorFromMarkdown("Existing");

    insertMarkdownAtSelection(editor, "", selectionFrom(editor));

    expect(readMarkdown(editor).trim()).toBe("Existing");
  });

  it("parses inline markdown like bold and links", () => {
    const editor = editorFromMarkdown("");

    insertMarkdownAtSelection(
      editor,
      "**Bold** and [link](https://example.com)",
      selectionFrom(editor),
    );

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("**Bold**");
    expect(markdown).toContain("[link](https://example.com)");
  });

  it("pastes block markdown into a table cell as literal markdown text", () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", "| a  |", ""].join("\n"));
    selectText(editor, "a");

    insertMarkdownAtSelection(editor, "# Heading\n\n- one\n- two", selectionFrom(editor));

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [
        {
          children: [{ children: [{ type: "text", value: "h1" }], type: "tableCell" }],
          type: "tableRow",
        },
        {
          children: [
            {
              children: [{ type: "text", value: "a # Heading - one\n- two" }],
              type: "tableCell",
            },
          ],
          type: "tableRow",
        },
      ],
      type: "table",
    });
  });

  it("inserts pasted markdown at the caret inside a table cell", () => {
    const editor = editorFromMarkdown(["| h1    |", "| ----- |", "| abcde |", ""].join("\n"));
    selectText(editor, "abcde", 2);

    insertMarkdownAtSelection(editor, "# Heading", selectionFrom(editor));

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [
        {
          children: [{ children: [{ type: "text", value: "h1" }], type: "tableCell" }],
          type: "tableRow",
        },
        {
          children: [
            {
              children: [{ type: "text", value: "ab # Heading cde" }],
              type: "tableCell",
            },
          ],
          type: "tableRow",
        },
      ],
      type: "table",
    });
  });

  it("preserves selection-anchored insertion point across paragraphs", () => {
    const editor = editorFromMarkdown("first\n\nsecond");
    selectText(editor, "first");

    insertMarkdownAtSelection(editor, "INSERTED", selectionFrom(editor));

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("firstINSERTED");
    expect(markdown).toContain("second");
  });
});
