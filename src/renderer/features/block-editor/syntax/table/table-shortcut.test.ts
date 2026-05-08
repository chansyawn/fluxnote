import { registerMarkdownShortcuts } from "@lexical/markdown";
import { $getRoot, $isTextNode, KEY_ENTER_COMMAND, type LexicalEditor } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { exportLexicalToSemanticDocument, importSemanticDocumentToLexical } from "../../model";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../registry";

interface KeyboardEventStub extends KeyboardEvent {
  readonly preventedForTest: boolean;
}

function keyboardEvent(): KeyboardEventStub {
  let prevented = false;
  return {
    preventDefault() {
      prevented = true;
    },
    get preventedForTest() {
      return prevented;
    },
    shiftKey: false,
  } as KeyboardEventStub;
}

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
  const event = keyboardEvent();
  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => $isTextNode(node) && node.getTextContent() === value);

      if (!textNode) {
        throw new Error(`Missing text node: ${value}`);
      }

      textNode.select(value.length, value.length);
      expect(editor.dispatchCommand(KEY_ENTER_COMMAND, event)).toBe(true);
    },
    { discrete: true },
  );
  return event;
}

describe("table shortcut", () => {
  it("creates a GFM table after typing a delimiter row and pressing enter", () => {
    const editor = createEditorWithTableShortcut("| Name | Count |", "| :--- | ---: |");
    const unregister = registerMarkdownShortcuts(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);

    const event = dispatchEnterAtTextEnd(editor, "| :--- | ---: |");

    unregister();
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
    const unregister = registerMarkdownShortcuts(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);
    const event = keyboardEvent();

    editor.update(
      () => {
        const textNode = $getRoot()
          .getAllTextNodes()
          .find((node) => $isTextNode(node) && node.getTextContent() === "| --- |");

        if (!textNode) {
          throw new Error("Missing delimiter node");
        }

        textNode.select("| --- |".length, "| --- |".length);
        expect(editor.dispatchCommand(KEY_ENTER_COMMAND, event)).toBe(false);
      },
      { discrete: true },
    );

    unregister();
    expect(event.preventedForTest).toBe(false);
    expect(exportLexicalToSemanticDocument(editor.getEditorState()).children).toHaveLength(2);
  });
});
