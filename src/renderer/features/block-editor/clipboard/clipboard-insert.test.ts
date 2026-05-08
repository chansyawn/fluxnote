import { describe, expect, it } from "vite-plus/test";

import { exportEditorStateToMarkdown } from "../editor-state";
import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import { insertMarkdownTablesAtSelection } from "./clipboard-insert";

describe("clipboard insert", () => {
  it("inserts pasted GFM markdown tables", () => {
    const editor = createHeadlessMarkdownEditor();

    expect(
      insertMarkdownTablesAtSelection(
        editor,
        ["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
        null,
      ),
    ).toBe(true);

    expect(exportEditorStateToMarkdown(editor.getEditorState())).toContain("| A");
  });

  it("ignores plain markdown without tables", () => {
    const editor = createHeadlessMarkdownEditor();

    expect(insertMarkdownTablesAtSelection(editor, "Plain text", null)).toBe(false);
  });
});
