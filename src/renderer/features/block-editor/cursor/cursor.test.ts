import {
  $getRoot,
  $getSelection,
  $getNodeByKey,
  $isParagraphNode,
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, readMarkdown } from "../test-helper/editor-driver";
import { filterGapCursorNodes } from "./cursor-normalize";
import { $isGapCursorParagraph, $promoteGapCursorParagraph } from "./cursor-state";

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

function selectText(editor: LexicalEditor, text: string, offset: number): void {
  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => node.getTextContent() === text);
      if (!textNode) {
        throw new Error(`Unable to find text node "${text}".`);
      }

      textNode.select(offset, offset);
    },
    { discrete: true },
  );
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

function getRootSummary(editor: LexicalEditor): string[] {
  let summary: string[] = [];
  editor.getEditorState().read(() => {
    summary = $getRoot()
      .getChildren()
      .map((node) => ($isGapCursorParagraph(node) ? "gap" : node.getType()));
  });
  return summary;
}

function isSelectionInGap(editor: LexicalEditor): boolean {
  let result = false;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    result = $isGapCursorParagraph(selection.anchor.getNode().getTopLevelElement());
  });
  return result;
}

describe("gap cursor", () => {
  it("filters serialized gap cursor paragraphs from clipboard nodes", () => {
    const nodes = [
      { type: "paragraph", $: { fluxnotesGapCursor: true } },
      { type: "code" },
      { type: "paragraph" },
      {
        type: "quote",
        children: [{ type: "paragraph", $: { fluxnotesGapCursor: true } }, { type: "paragraph" }],
      },
    ];

    expect(filterGapCursorNodes(nodes)).toEqual([
      { type: "code" },
      { type: "paragraph" },
      {
        type: "quote",
        children: [{ type: "paragraph" }],
      },
    ]);
  });

  it("adds hidden gaps around root-level non-text blocks without exporting them", () => {
    const editor = editorFromMarkdown(["```ts", "const x = 1;", "```", ""].join("\n"));

    expect(getRootSummary(editor)).toEqual(["gap", "code", "gap"]);
    expect(readMarkdown(editor)).toBe(["```ts", "const x = 1;", "```", ""].join("\n"));
  });

  it("keeps a single reachable gap between adjacent boundary blocks", () => {
    const editor = editorFromMarkdown(
      ["```", "a", "```", "", "> b", "", "| h |", "| - |", "| c |", ""].join("\n"),
    );

    expect(getRootSummary(editor)).toEqual(["gap", "code", "gap", "quote", "gap", "table", "gap"]);
  });

  it("moves from block edges into before and after gaps", () => {
    const editor = editorFromMarkdown(["```", "abc", "```", ""].join("\n"));

    selectText(editor, "abc", 0);
    expect(dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInGap(editor)).toBe(true);

    selectText(editor, "abc", 3);
    expect(dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInGap(editor)).toBe(true);
  });

  it("moves from table edges into before and after gaps", () => {
    const editor = editorFromMarkdown(["| h |", "| - |", "| c |", ""].join("\n"));

    selectText(editor, "h", 0);
    expect(dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInGap(editor)).toBe(true);

    selectText(editor, "c", 1);
    expect(dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInGap(editor)).toBe(true);
  });

  it("promotes a gap to a normal paragraph on enter", () => {
    const editor = editorFromMarkdown(["```", "abc", "```", ""].join("\n"));
    selectGap(editor, "first");

    expect(dispatchCommand(editor, KEY_ENTER_COMMAND, keyboardPayload())).toBe(true);

    editor.getEditorState().read(() => {
      const first = $getRoot().getFirstChild();
      expect($isParagraphNode(first)).toBe(true);
      expect($isGapCursorParagraph(first)).toBe(false);
    });
  });

  it("promotes a gap before text insertion so typed text is persisted", () => {
    const editor = editorFromMarkdown(["```", "abc", "```", ""].join("\n"));
    selectGap(editor, "last");

    dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, "after");

    expect(readMarkdown(editor)).toBe(["```", "abc", "```", "", "after", ""].join("\n"));
  });

  it("promotes a clicked gap to a normal paragraph at the same position", () => {
    const editor = editorFromMarkdown(["```", "abc", "```", ""].join("\n"));
    let gapKey = "";

    editor.update(
      () => {
        const gap = $getRoot().getFirstChild();
        if (!$isGapCursorParagraph(gap)) {
          throw new Error("Expected first root child to be a gap cursor.");
        }

        gapKey = gap.getKey();
        expect($promoteGapCursorParagraph(gap)).toBe(true);
        gap.selectStart();
      },
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const promoted = $getNodeByKey(gapKey);
      const selection = $getSelection();

      expect($isParagraphNode(promoted)).toBe(true);
      expect($isGapCursorParagraph(promoted)).toBe(false);
      if (!$isRangeSelection(selection)) {
        throw new Error("Expected range selection after promoting gap cursor.");
      }
      expect(selection.anchor.key).toBe(gapKey);
      expect(selection.anchor.offset).toBe(0);
    });
  });
});
