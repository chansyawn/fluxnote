import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import {
  createHeadlessEditor,
  editorFromMarkdown,
  readMarkdown,
  readMdast,
} from "../../test-helper/editor-driver";
import { selectEmptyParagraph, selectText } from "../../test-helper/interaction-driver";

function dispatchCommand<TPayload>(
  editor: LexicalEditor,
  command: LexicalCommand<TPayload>,
  payload: TPayload,
): boolean {
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(command, payload);
    },
    { discrete: true },
  );
  return handled;
}

function selectRootStart(editor: LexicalEditor): void {
  editor.update(
    () => {
      $getRoot().selectStart();
    },
    { discrete: true },
  );
}

function typeText(editor: LexicalEditor, text: string): void {
  for (const character of text) {
    dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, character);
  }
}

function readSelection(editor: LexicalEditor): { nodeText: string; offset: number } {
  return editor.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      throw new Error("Expected range selection.");
    }

    return {
      nodeText: selection.anchor.getNode().getTextContent(),
      offset: selection.anchor.offset,
    };
  });
}

describe("inline markdown selection", () => {
  it("keeps the caret after bold markdown conversion", () => {
    const editor = createHeadlessEditor();

    selectRootStart(editor);
    typeText(editor, "**b**");

    expect(readMarkdown(editor).trim()).toBe("**b**");
    expect(readSelection(editor)).toEqual({ nodeText: "b", offset: 1 });
  });

  it("keeps the caret after inline code markdown conversion", () => {
    const editor = createHeadlessEditor();

    selectRootStart(editor);
    typeText(editor, "`xxx`");

    expect(readMarkdown(editor).trim()).toBe("`xxx`");
    expect(readSelection(editor)).toEqual({ nodeText: "xxx", offset: 3 });
  });

  it("still applies container markdown shortcuts inside lists", () => {
    const editor = editorFromMarkdown("- \n");

    selectEmptyParagraph(editor);
    typeText(editor, "# ");
    typeText(editor, "title");

    expect(JSON.stringify(readMdast(editor))).toContain('"type":"heading"');
    expect(JSON.stringify(readMdast(editor))).toContain('"value":"title"');
  });

  it("still applies container markdown shortcuts inside quotes", () => {
    const editor = editorFromMarkdown("> \n");

    selectEmptyParagraph(editor);
    typeText(editor, "- ");
    typeText(editor, "item");

    expect(JSON.stringify(readMdast(editor))).toContain('"type":"list"');
    expect(JSON.stringify(readMdast(editor))).toContain('"value":"item"');
  });

  it("still applies inline markdown shortcuts inside table cells", () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", "| a  |", ""].join("\n"));

    selectText(editor, "a", 0);
    typeText(editor, "**bold**");
    typeText(editor, " `code`");

    expect(readMarkdown(editor)).toContain("**bold**");
    expect(readMarkdown(editor)).toContain("`code`");
    expect(JSON.stringify(readMdast(editor))).toContain('"type":"strong"');
    expect(JSON.stringify(readMdast(editor))).toContain('"type":"inlineCode"');
  });
});
