import { $isListItemNode } from "@lexical/list";
import { $isQuoteNode } from "@lexical/rich-text";
import {
  $getRoot,
  $getSelection,
  $getNodeByKey,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
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

function selectNestedGap(editor: LexicalEditor, position: "first" | "last"): void {
  editor.update(
    () => {
      const nestedGaps: LexicalNode[] = [];

      function collectNestedGaps(node: LexicalNode): void {
        if ($isGapCursorParagraph(node) && !node.getParent()?.is($getRoot())) {
          nestedGaps.push(node);
        }
        if (!$isElementNode(node)) {
          return;
        }
        for (const child of node.getChildren()) {
          collectNestedGaps(child);
        }
      }

      for (const child of $getRoot().getChildren()) {
        collectNestedGaps(child);
      }

      const gap = position === "first" ? nestedGaps[0] : nestedGaps.at(-1);
      if (!gap || !$isParagraphNode(gap)) {
        throw new Error(`Unable to find ${position} nested gap cursor.`);
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

function getFirstNestedContainerSummary(
  editor: LexicalEditor,
  type: "listitem" | "quote",
): string[] {
  let summary: string[] = [];
  editor.getEditorState().read(() => {
    function findContainer(node: LexicalNode): LexicalNode | null {
      if (type === "quote" ? $isQuoteNode(node) : $isListItemNode(node)) {
        return node;
      }
      if (!$isElementNode(node)) {
        return null;
      }
      for (const child of node.getChildren()) {
        const match = findContainer(child);
        if (match) {
          return match;
        }
      }
      return null;
    }

    const container = findContainer($getRoot());

    if (!$isElementNode(container)) {
      throw new Error(`Unable to find nested ${type} container.`);
    }

    summary = container
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

    let current: LexicalNode | null = selection.anchor.getNode();
    while (current) {
      if ($isGapCursorParagraph(current)) {
        result = true;
        return;
      }
      current = current.getParent();
    }
  });
  return result;
}

function isSelectionInText(editor: LexicalEditor, text: string, offset: number): boolean {
  let result = false;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    result =
      selection.anchor.getNode().getTextContent() === text && selection.anchor.offset === offset;
  });
  return result;
}

function isSelectionInTopLevelType(editor: LexicalEditor, type: string): boolean {
  let result = false;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    result = selection.anchor.getNode().getTopLevelElement()?.getType() === type;
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

  it("adds hidden gaps around boundary blocks nested in quotes", () => {
    const markdown = ["> before", ">", "> ```", "> abc", "> ```", ">", "> after", ""].join("\n");
    const editor = editorFromMarkdown(markdown);

    expect(getFirstNestedContainerSummary(editor, "quote")).toEqual([
      "paragraph",
      "gap",
      "code",
      "gap",
      "paragraph",
    ]);
    expect(readMarkdown(editor)).toBe(markdown);
  });

  it("adds hidden gaps around boundary blocks nested in list items", () => {
    const editor = editorFromMarkdown(
      ["- before", "", "  ```", "  abc", "  ```", "", "  after", ""].join("\n"),
    );

    expect(getFirstNestedContainerSummary(editor, "listitem")).toEqual([
      "paragraph",
      "gap",
      "code",
      "gap",
      "paragraph",
    ]);
  });

  it("adds hidden gaps between ordinary paragraphs and boundary blocks", () => {
    const markdown = ["before", "", "```", "abc", "```", "", "after", ""].join("\n");
    const editor = editorFromMarkdown(markdown);

    expect(getRootSummary(editor)).toEqual(["paragraph", "gap", "code", "gap", "paragraph"]);
    expect(readMarkdown(editor)).toBe(markdown);
  });

  it("does not add gaps between ordinary paragraphs", () => {
    const editor = editorFromMarkdown(["before", "", "after", ""].join("\n"));

    expect(getRootSummary(editor)).toEqual(["paragraph", "paragraph"]);
  });

  it("keeps a single reachable gap between adjacent boundary blocks", () => {
    const editor = editorFromMarkdown(
      ["```", "a", "```", "", "> b", "", "| h |", "| - |", "| c |", ""].join("\n"),
    );

    expect(getRootSummary(editor)).toEqual(["gap", "code", "gap", "quote", "gap", "table", "gap"]);
  });

  it("keeps a gap between promoted empty paragraphs and boundary blocks", () => {
    const editor = editorFromMarkdown(["```", "abc", "```", ""].join("\n"));
    selectGap(editor, "first");

    expect(dispatchCommand(editor, KEY_ENTER_COMMAND, keyboardPayload())).toBe(true);

    expect(getRootSummary(editor)).toEqual(["paragraph", "gap", "code", "gap"]);
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

  it("moves from nested block edges into before and after gaps", () => {
    const editor = editorFromMarkdown(
      ["> before", ">", "> ```", "> abc", "> ```", ">", "> after", ""].join("\n"),
    );

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

  it("moves between paragraph edges and adjacent gaps", () => {
    const editor = editorFromMarkdown(
      ["before", "", "```", "abc", "```", "", "after", ""].join("\n"),
    );

    selectText(editor, "before", 6);
    expect(dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInGap(editor)).toBe(true);

    expect(dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInText(editor, "before", 6)).toBe(true);

    selectText(editor, "after", 0);
    expect(dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInGap(editor)).toBe(true);

    expect(dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInText(editor, "after", 0)).toBe(true);
  });

  it("handles delete and backspace across paragraph and boundary gaps", () => {
    const forwardEditor = editorFromMarkdown(
      ["before", "", "```", "abc", "```", "", "after", ""].join("\n"),
    );
    selectText(forwardEditor, "before", 6);

    expect(dispatchCommand(forwardEditor, KEY_DELETE_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInTopLevelType(forwardEditor, "code")).toBe(true);

    const backwardEditor = editorFromMarkdown(
      ["before", "", "```", "abc", "```", "", "after", ""].join("\n"),
    );
    selectText(backwardEditor, "after", 0);

    expect(dispatchCommand(backwardEditor, KEY_BACKSPACE_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInTopLevelType(backwardEditor, "code")).toBe(true);
  });

  it("deletes an empty paragraph after a boundary block before selecting the boundary", () => {
    const editor = editorFromMarkdown(["```", "abc", "```", ""].join("\n"));
    selectGap(editor, "last");
    expect(dispatchCommand(editor, KEY_ENTER_COMMAND, keyboardPayload())).toBe(true);

    expect(getRootSummary(editor)).toEqual(["gap", "code", "gap", "paragraph"]);

    expect(dispatchCommand(editor, KEY_BACKSPACE_COMMAND, keyboardPayload())).toBe(true);
    expect(getRootSummary(editor)).toEqual(["gap", "code", "gap"]);
    expect(isSelectionInGap(editor)).toBe(true);
    expect(readMarkdown(editor)).toBe(["```", "abc", "```", ""].join("\n"));

    expect(dispatchCommand(editor, KEY_BACKSPACE_COMMAND, keyboardPayload())).toBe(true);
    expect(isSelectionInTopLevelType(editor, "code")).toBe(true);
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

  it("promotes a nested gap to a normal paragraph on enter", () => {
    const editor = editorFromMarkdown(["> ```", "> abc", "> ```", ""].join("\n"));
    selectNestedGap(editor, "first");

    expect(dispatchCommand(editor, KEY_ENTER_COMMAND, keyboardPayload())).toBe(true);

    expect(getFirstNestedContainerSummary(editor, "quote")).toEqual([
      "paragraph",
      "gap",
      "code",
      "gap",
    ]);
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
