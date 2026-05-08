import type { LexicalEditor } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { exportLexicalToSemanticDocument, importSemanticDocumentToLexical } from "../../model";
import {
  selectTextEndAndDispatchEnter,
  type KeyboardEventStub,
} from "../../test-helper/editor-driver";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";

function createEditorWithTableShortcut(header: string, delimiter: string): LexicalEditor {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(
    {
      children: [
        { children: [{ type: "text", value: header }], type: "paragraph" },
        { children: [{ type: "text", value: delimiter }], type: "paragraph" },
      ],
      type: "root",
    },
    editor,
  );
  return editor;
}

function dispatchEnterAtTextEnd(editor: LexicalEditor, value: string): KeyboardEventStub {
  return selectTextEndAndDispatchEnter(editor, value);
}

describe("table shortcut", () => {
  it("creates a GFM table after typing a delimiter row and pressing enter", () => {
    const editor = createEditorWithTableShortcut("| Name | Count |", "| :--- | ---: |");

    const event = dispatchEnterAtTextEnd(editor, "| :--- | ---: |");

    expect(event.preventedForTest).toBe(true);
    expect(exportLexicalToSemanticDocument(editor.getEditorState())).toEqual({
      children: [
        {
          align: ["left", "right"],
          rows: [
            {
              cells: [
                { children: [{ type: "text", value: "Name" }], type: "tableCell" },
                { children: [{ type: "text", value: "Count" }], type: "tableCell" },
              ],
              type: "tableRow",
            },
            {
              cells: [
                { children: [], type: "tableCell" },
                { children: [], type: "tableCell" },
              ],
              type: "tableRow",
            },
          ],
          type: "table",
        },
      ],
      type: "root",
    });
  });

  it("does not transform when the delimiter does not match the header column count", () => {
    const editor = createEditorWithTableShortcut("| Name | Count |", "| --- |");
    selectTextEndAndDispatchEnter(editor, "| --- |");

    expect(exportLexicalToSemanticDocument(editor.getEditorState())).toEqual({
      children: [
        { children: [{ type: "text", value: "| Name | Count |" }], type: "paragraph" },
        { children: [{ type: "text", value: "| --- |" }], type: "paragraph" },
        { children: [], type: "paragraph" },
      ],
      type: "root",
    });
  });
});
