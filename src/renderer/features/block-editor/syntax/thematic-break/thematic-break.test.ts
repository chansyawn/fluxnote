import { $isHorizontalRuleNode } from "@lexical/extension";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { $isGapCursorParagraph } from "../../cursor";
import {
  applyMarkdownShortcuts,
  createHeadlessEditor,
  editorFromMarkdown,
  readMdast,
} from "../../test-helper/editor-driver";
import { pressBackspace, pressEnter } from "../../test-helper/interaction-driver";

function keyboardPayload(): KeyboardEvent {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
    shiftKey: false,
  } as KeyboardEvent;
}

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

function createEditorWithTypedThematicBreak(): LexicalEditor {
  const editor = createHeadlessEditor();

  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode().append($createTextNode("---")));
      root.getLastChild()?.selectEnd();
    },
    { discrete: true },
  );

  return editor;
}

function insertText(editor: LexicalEditor, text: string): void {
  dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, text);
}

function selectGap(editor: LexicalEditor, position: "first" | "last"): void {
  editor.update(
    () => {
      const gaps = $getRoot().getChildren().filter($isGapCursorParagraph);
      const gap = position === "first" ? gaps[0] : gaps.at(-1);
      if (!gap) {
        throw new Error(`Unable to find ${position} gap cursor.`);
      }

      gap.selectStart();
    },
    { discrete: true },
  );
}

function isThematicBreakSelected(editor: LexicalEditor): boolean {
  let result = false;

  editor.getEditorState().read(() => {
    const selection = $getSelection();
    result =
      $isNodeSelection(selection) &&
      selection.getNodes().length === 1 &&
      $isHorizontalRuleNode(selection.getNodes()[0]);
  });

  return result;
}

function hasThematicBreak(editor: LexicalEditor): boolean {
  return readMdast(editor).children.some((child) => child.type === "thematicBreak");
}

describe("thematic break", () => {
  it("imports `---` as a thematic break", () => {
    const result = applyMarkdownShortcuts("---");
    expect(result.children[0]).toMatchObject({ type: "thematicBreak" });
  });

  it("creates a thematic break when space follows `---` on an empty line", () => {
    const editor = createEditorWithTypedThematicBreak();

    insertText(editor, " ");

    expect(readMdast(editor).children[0]).toMatchObject({ type: "thematicBreak" });
  });

  it("creates a thematic break when enter follows `---` on an empty line", () => {
    const editor = createEditorWithTypedThematicBreak();

    expect(pressEnter(editor)).toBe(true);

    expect(readMdast(editor).children[0]).toMatchObject({ type: "thematicBreak" });
  });

  it("selects the thematic break when keyboard navigation moves from a gap into it", () => {
    const editor = editorFromMarkdown("---\n");
    selectGap(editor, "first");

    expect(dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, keyboardPayload())).toBe(true);

    expect(isThematicBreakSelected(editor)).toBe(true);
  });

  it("selects then deletes a thematic break with backspace from the following gap", () => {
    const editor = editorFromMarkdown("---\n");
    selectGap(editor, "last");

    expect(pressBackspace(editor)).toBe(true);
    expect(isThematicBreakSelected(editor)).toBe(true);

    expect(pressBackspace(editor)).toBe(true);
    expect(hasThematicBreak(editor)).toBe(false);
  });

  it("selects then deletes a newly created thematic break with backspace", () => {
    const editor = createEditorWithTypedThematicBreak();
    insertText(editor, " ");

    expect(pressBackspace(editor)).toBe(true);
    expect(isThematicBreakSelected(editor)).toBe(true);

    expect(pressBackspace(editor)).toBe(true);
    expect(hasThematicBreak(editor)).toBe(false);
  });
});
