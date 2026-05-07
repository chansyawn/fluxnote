import { $createListItemNode, $createListNode, $isListItemNode } from "@lexical/list";
import {
  $createRangeSelection,
  $getSelection,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  type SemanticBlock,
  type SemanticBlockquote,
  type SemanticCodeBlock,
  type SemanticDocument,
  type SemanticList,
  type SemanticListItem,
  type SemanticParagraph,
} from "../../model";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { registerSoftBreakShortcut } from "../break/soft-break-shortcut-plugin";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../registry";
import { registerListKeyboardCommands } from "./list-commands";
import { applyListContainerMarkdownShortcutAtSelection } from "./list-shortcuts";

interface KeyboardEventStub extends KeyboardEvent {
  readonly preventedForTest: boolean;
}

function paragraph(value = ""): SemanticParagraph {
  return {
    children: value.length > 0 ? [{ type: "text", value }] : [],
    type: "paragraph",
  };
}

function quote(children: SemanticBlock[]): SemanticBlockquote {
  return { children, type: "blockquote" };
}

function codeBlock(value: string, lang: string | null = null): SemanticCodeBlock {
  return { lang, type: "codeBlock", value };
}

function item(children: SemanticBlock[]): SemanticListItem {
  return { children, type: "listItem" };
}

function list(children: SemanticListItem[], ordered = false): SemanticList {
  return { children, ordered, type: "list" };
}

function document(children: SemanticBlock[]): SemanticDocument {
  return { children, type: "root" };
}

function keyboardEvent(options: Partial<KeyboardEvent> = {}): KeyboardEventStub {
  let prevented = false;
  return {
    altKey: false,
    preventDefault() {
      prevented = true;
    },
    get preventedForTest() {
      return prevented;
    },
    shiftKey: false,
    ...options,
  } as KeyboardEventStub;
}

function createEditor(documentNode: SemanticDocument, includeSoftBreak = false) {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(documentNode, editor);
  const unregisterList = registerListKeyboardCommands(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);
  const unregisterSoftBreak = includeSoftBreak ? registerSoftBreakShortcut(editor) : () => {};
  const unregister = () => {
    unregisterSoftBreak();
    unregisterList();
  };

  return {
    editor,
    unregister,
  };
}

function semantic(editor: LexicalEditor): SemanticDocument {
  return exportLexicalToSemanticDocument(editor.getEditorState());
}

function findTextNode(text: string, occurrence = 0): TextNode {
  const nodes = $getRoot()
    .getAllTextNodes()
    .filter((node) => $isTextNode(node) && node.getTextContent() === text);
  const node = nodes[occurrence];
  if (!node) {
    throw new Error(`Missing text node "${text}" at occurrence ${occurrence}`);
  }
  return node;
}

function findParagraphByText(text: string, occurrence = 0): ElementNode {
  const paragraphs: ElementNode[] = [];

  function visit(node: LexicalNode): void {
    if ($isParagraphNode(node) && node.getTextContent() === text) {
      paragraphs.push(node);
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        visit(child);
      }
    }
  }

  visit($getRoot());
  const paragraphNode = paragraphs[occurrence];
  if (!paragraphNode) {
    throw new Error(`Missing paragraph "${text}" at occurrence ${occurrence}`);
  }
  return paragraphNode;
}

function selectText(
  editor: LexicalEditor,
  text: string,
  offset = text.length,
  occurrence = 0,
): void {
  editor.update(
    () => {
      findTextNode(text, occurrence).select(offset, offset);
    },
    { discrete: true },
  );
}

function selectParagraph(editor: LexicalEditor, text: string, occurrence = 0): void {
  editor.update(
    () => {
      findParagraphByText(text, occurrence).select(0, 0);
    },
    { discrete: true },
  );
}

function selectTextRange(
  editor: LexicalEditor,
  startText: string,
  startOffset: number,
  endText: string,
  endOffset: number,
): void {
  editor.update(
    () => {
      const startNode = findTextNode(startText);
      const endNode = findTextNode(endText);
      const selection = $createRangeSelection();
      selection.anchor.set(startNode.getKey(), startOffset, "text");
      selection.focus.set(endNode.getKey(), endOffset, "text");
      $setSelection(selection);
    },
    { discrete: true },
  );
}

function dispatchEnter(editor: LexicalEditor, options: Partial<KeyboardEvent> = {}) {
  const event = keyboardEvent(options);
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(KEY_ENTER_COMMAND, event);
    },
    { discrete: true },
  );
  return { handled, prevented: event.preventedForTest };
}

function dispatchTab(editor: LexicalEditor, options: Partial<KeyboardEvent> = {}) {
  const event = keyboardEvent(options);
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(KEY_TAB_COMMAND, event);
    },
    { discrete: true },
  );
  return { handled, prevented: event.preventedForTest };
}

function dispatchBackspace(editor: LexicalEditor) {
  const event = keyboardEvent();
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
    },
    { discrete: true },
  );
  return { handled, prevented: event.preventedForTest };
}

function applyShortcut(editor: LexicalEditor): boolean {
  let handled = false;
  editor.update(
    () => {
      handled = applyListContainerMarkdownShortcutAtSelection(MARKDOWN_SHORTCUT_TRANSFORMERS);
    },
    { discrete: true },
  );
  return handled;
}

function createRawListEditor() {
  const editor = createHeadlessMarkdownEditor();
  const unregister = registerListKeyboardCommands(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);

  editor.update(
    () => {
      const root = $getRoot();
      const listNode = $createListNode("bullet", 1);
      const listItem = $createListItemNode();
      root.clear();
      listNode.append(listItem);
      root.append(listNode);
      listItem.select(0, 0);
    },
    { discrete: true },
  );

  return { editor, unregister };
}

function insertText(editor: LexicalEditor, value: string): void {
  editor.update(
    () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error("Missing range selection for text insertion");
      }
      selection.insertText(value);
    },
    { discrete: true },
  );
}

function createNestedRawList(editor: LexicalEditor): void {
  editor.update(
    () => {
      const rootChild = $getRoot().getFirstChild();
      const listItem = $isElementNode(rootChild) ? rootChild.getFirstChild() : null;
      if (!$isListItemNode(listItem)) {
        throw new Error("Missing list item for nested raw shortcut setup");
      }

      const nestedList = $createListNode("bullet", 1);
      const nestedItem = $createListItemNode();
      nestedList.append(nestedItem);
      listItem.splice(listItem.getChildrenSize(), 0, [nestedList]);
      nestedItem.select(0, 0);
    },
    { discrete: true },
  );
}

describe("list keyboard", () => {
  it("inserts soft break from shift enter without creating list items or blocks", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("helloworld")])])]),
      true,
    );
    selectText(editor, "helloworld", 5);

    expect(dispatchEnter(editor, { shiftKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([
            {
              children: [
                { type: "text", value: "hello" },
                { type: "softBreak" },
                { type: "text", value: "world" },
              ],
              type: "paragraph",
            },
          ]),
        ]),
      ]),
    );
    unregister();
  });

  it("continues typing inside a freshly created raw list item", () => {
    const { editor, unregister } = createRawListEditor();

    insertText(editor, "A");

    expect(semantic(editor)).toEqual(document([list([item([paragraph("A")])])]));
    unregister();
  });

  it("splits a freshly created raw list item on enter after typing", () => {
    const { editor, unregister } = createRawListEditor();
    insertText(editor, "A");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("A")]), item([paragraph()])])]),
    );
    unregister();
  });

  it("unwraps a freshly created empty raw list item on backspace", () => {
    const { editor, unregister } = createRawListEditor();

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([paragraph()]));
    unregister();
  });

  it("continues editing a nested raw list created from a list-item shortcut", () => {
    const { editor, unregister } = createEditor(document([list([item([paragraph("A")])])]));
    createNestedRawList(editor);
    insertText(editor, "B");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list([item([paragraph("A"), list([item([paragraph("B")]), item([paragraph()])])])]),
      ]),
    );
    unregister();
  });

  it("outdents a freshly created empty nested raw list item on backspace", () => {
    const { editor, unregister } = createEditor(document([list([item([paragraph("A")])])]));
    createNestedRawList(editor);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("A")]), item([paragraph()])])]),
    );
    unregister();
  });

  it("splits a single paragraph item into a sibling item", () => {
    const { editor, unregister } = createEditor(document([list([item([paragraph("Hello")])])]));
    selectText(editor, "Hello", 3);

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("Hel")]), item([paragraph("lo")])])]),
    );
    unregister();
  });

  it("unwraps an empty top-level item on enter", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("A")]), item([paragraph()])])]),
    );
    selectParagraph(editor, "");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([list([item([paragraph("A")])]), paragraph()]));
    unregister();
  });

  it("outdents an empty nested item on enter", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("A"), list([item([paragraph()])])])])]),
    );
    selectParagraph(editor, "");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("A")]), item([paragraph()])])]),
    );
    unregister();
  });

  it("does not split the list item when enter is handled inside a code block", () => {
    const source = document([list([item([codeBlock("const a = 1")])])]);
    const { editor, unregister } = createEditor(source);
    selectText(editor, "const a = 1");

    expect(dispatchEnter(editor)).toMatchObject({ handled: false, prevented: false });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });

  it("creates a sibling item from the last paragraph in a multi-block item", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("paragraph 1"), paragraph("paragraph 2")])])]),
    );
    selectText(editor, "paragraph 2");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list([item([paragraph("paragraph 1"), paragraph("paragraph 2")]), item([paragraph()])]),
      ]),
    );
    unregister();
  });

  it("delegates enter from a non-last block in a multi-block item", () => {
    const source = document([list([item([paragraph("paragraph 1"), paragraph("paragraph 2")])])]);
    const { editor, unregister } = createEditor(source);
    selectText(editor, "paragraph 1");

    expect(dispatchEnter(editor)).toMatchObject({ handled: false, prevented: false });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });

  it("delegates enter from a non-last paragraph when trailing blocks are empty", () => {
    const source = document([list([item([paragraph("paragraph 1"), paragraph()])])]);
    const { editor, unregister } = createEditor(source);
    selectText(editor, "paragraph 1");

    expect(dispatchEnter(editor)).toMatchObject({ handled: false, prevented: false });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });

  it("creates a sibling item from a paragraph end before a nested list", () => {
    const { editor, unregister } = createEditor(
      document([
        list(
          [
            item([paragraph("a")]),
            item([paragraph("b"), list([item([paragraph("c")]), item([paragraph("d")])], true)]),
          ],
          true,
        ),
      ]),
    );
    selectText(editor, "b");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list(
          [
            item([paragraph("a")]),
            item([paragraph("b")]),
            item([paragraph(), list([item([paragraph("c")]), item([paragraph("d")])], true)]),
          ],
          true,
        ),
      ]),
    );
    unregister();
  });

  it("splits a paragraph before a nested list from the cursor position", () => {
    const { editor, unregister } = createEditor(
      document([
        list([
          item([paragraph("alpha")]),
          item([paragraph("beta"), list([item([paragraph("nested")])])]),
        ]),
      ]),
    );
    selectText(editor, "beta", 1);

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([paragraph("alpha")]),
          item([paragraph("b")]),
          item([paragraph("eta"), list([item([paragraph("nested")])])]),
        ]),
      ]),
    );
    unregister();
  });

  it("inserts an internal paragraph from alt enter in a single paragraph item", () => {
    const { editor, unregister } = createEditor(document([list([item([paragraph("A")])])]));
    selectText(editor, "A");

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(document([list([item([paragraph("A"), paragraph()])])]));
    unregister();
  });

  it("creates a sibling item from alt enter in a multi-block item", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("paragraph 1"), paragraph("paragraph 2")])])]),
    );
    selectText(editor, "paragraph 2");

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([
        list([item([paragraph("paragraph 1"), paragraph("paragraph 2")]), item([paragraph()])]),
      ]),
    );
    unregister();
  });

  it("splits a multi-block item from alt enter after a middle paragraph", () => {
    const { editor, unregister } = createEditor(
      document([
        list([
          item([paragraph("paragraph 1"), paragraph("paragraph 2"), paragraph("paragraph 3")]),
        ]),
      ]),
    );
    selectText(editor, "paragraph 2");

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([paragraph("paragraph 1"), paragraph("paragraph 2")]),
          item([paragraph("paragraph 3")]),
        ]),
      ]),
    );
    unregister();
  });

  it("splits a middle paragraph and trailing blocks from alt enter", () => {
    const { editor, unregister } = createEditor(
      document([
        list([item([paragraph("paragraph 1"), paragraph("Beta"), paragraph("paragraph 3")])]),
      ]),
    );
    selectText(editor, "Beta", 2);

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([paragraph("paragraph 1"), paragraph("Be")]),
          item([paragraph("ta"), paragraph("paragraph 3")]),
        ]),
      ]),
    );
    unregister();
  });

  it("splits trailing blocks after a structured block from alt enter", () => {
    const { editor, unregister } = createEditor(
      document([
        list([
          item([paragraph("paragraph 1"), quote([paragraph("quote")]), paragraph("paragraph 3")]),
        ]),
      ]),
    );
    selectText(editor, "quote");

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([paragraph("paragraph 1"), quote([paragraph("quote")])]),
          item([paragraph("paragraph 3")]),
        ]),
      ]),
    );
    unregister();
  });

  it("creates a sibling item from alt enter in a quote context", () => {
    const { editor, unregister } = createEditor(
      document([list([item([quote([paragraph("quote")])])])]),
    );
    selectText(editor, "quote");

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([list([item([quote([paragraph("quote")])]), item([paragraph()])])]),
    );
    unregister();
  });

  it("indents a single item under its previous sibling", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("A")]), item([paragraph("B")])])]),
    );
    selectText(editor, "B");

    expect(dispatchTab(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("A"), list([item([paragraph("B")])])])])]),
    );
    unregister();
  });

  it("preserves nested children when indenting an item subtree", () => {
    const { editor, unregister } = createEditor(
      document([
        list([
          item([paragraph("A")]),
          item([paragraph("B"), list([item([paragraph("B.1")]), item([paragraph("B.2")])])]),
          item([paragraph("C")]),
        ]),
      ]),
    );
    selectText(editor, "B");

    expect(dispatchTab(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([
            paragraph("A"),
            list([
              item([paragraph("B"), list([item([paragraph("B.1")]), item([paragraph("B.2")])])]),
            ]),
          ]),
          item([paragraph("C")]),
        ]),
      ]),
    );
    unregister();
  });

  it("keeps structure unchanged when indenting an item without a previous sibling", () => {
    const source = document([list([item([paragraph("A")])])]);
    const { editor, unregister } = createEditor(source);
    selectText(editor, "A");

    expect(dispatchTab(editor)).toMatchObject({ handled: true, prevented: true });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });

  it("outdents a nested item", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("A"), list([item([paragraph("B")])])])])]),
    );
    selectText(editor, "B");

    expect(dispatchTab(editor, { shiftKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("A")]), item([paragraph("B")])])]),
    );
    unregister();
  });

  it("unwraps a top-level multi-block item on shift tab", () => {
    const { editor, unregister } = createEditor(
      document([
        list([item([paragraph("A"), quote([paragraph("quote")])]), item([paragraph("B")])]),
      ]),
    );
    selectText(editor, "A");

    expect(dispatchTab(editor, { shiftKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([paragraph("A"), quote([paragraph("quote")]), list([item([paragraph("B")])])]),
    );
    unregister();
  });

  it("indents multiple sibling items while preserving order", () => {
    const { editor, unregister } = createEditor(
      document([
        list([
          item([paragraph("A")]),
          item([paragraph("B")]),
          item([paragraph("C")]),
          item([paragraph("D")]),
        ]),
      ]),
    );
    selectTextRange(editor, "B", 0, "C", 1);

    expect(dispatchTab(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([paragraph("A"), list([item([paragraph("B")]), item([paragraph("C")])])]),
          item([paragraph("D")]),
        ]),
      ]),
    );
    unregister();
  });

  it("normalizes parent and child multi-selection before indenting", () => {
    const source = document([
      list([
        item([paragraph("A"), list([item([paragraph("A.1")]), item([paragraph("A.2")])])]),
        item([paragraph("B")]),
      ]),
    ]);
    const { editor, unregister } = createEditor(source);
    selectTextRange(editor, "A", 0, "A.2", 3);

    expect(dispatchTab(editor)).toMatchObject({ handled: true, prevented: true });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });

  it("exits a quote created by markdown shortcut before list marker backspace", () => {
    const { editor, unregister } = createEditor(document([list([item([paragraph("> quote")])])]));
    selectText(editor, "> quote", 2);
    expect(applyShortcut(editor)).toBe(true);
    selectText(editor, "quote", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([list([item([paragraph("quote")])])]));
    unregister();
  });

  it("exits a code block before list marker backspace", () => {
    const { editor, unregister } = createEditor(
      document([list([item([codeBlock("const a = 1")])])]),
    );
    selectText(editor, "const a = 1", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([list([item([paragraph("const a = 1")])])]));
    unregister();
  });

  it("merges an item into the previous sibling from marker backspace", () => {
    const { editor, unregister } = createEditor(
      document([
        list([item([paragraph("A")]), item([paragraph("B"), quote([paragraph("quote")])])]),
      ]),
    );
    selectText(editor, "B", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([list([item([paragraph("A"), paragraph("B"), quote([paragraph("quote")])])])]),
    );
    unregister();
  });

  it("unwraps the first top-level item from marker backspace", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("A")]), item([paragraph("B")])])]),
    );
    selectText(editor, "A", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([paragraph("A"), list([item([paragraph("B")])])]));
    unregister();
  });

  it("outdents the first nested item from marker backspace", () => {
    const { editor, unregister } = createEditor(
      document([
        list([item([paragraph("A"), list([item([paragraph("B")]), item([paragraph("C")])])])]),
      ]),
    );
    selectText(editor, "B", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([
        list([item([paragraph("A")]), item([paragraph("B"), list([item([paragraph("C")])])])]),
      ]),
    );
    unregister();
  });

  it("applies block markdown shortcuts inside list items", () => {
    const { editor, unregister } = createEditor(
      document([
        list([
          item([paragraph("# Title")]),
          item([paragraph("> quote")]),
          item([paragraph("- nested")]),
          item([paragraph("1. ordered")]),
        ]),
      ]),
    );

    selectText(editor, "# Title", 2);
    expect(applyShortcut(editor)).toBe(true);
    selectText(editor, "> quote", 2);
    expect(applyShortcut(editor)).toBe(true);
    selectText(editor, "- nested", 2);
    expect(applyShortcut(editor)).toBe(true);
    selectText(editor, "1. ordered", 3);
    expect(applyShortcut(editor)).toBe(true);

    expect(semantic(editor)).toEqual(
      document([
        list([
          item([{ children: [{ type: "text", value: "Title" }], depth: 1, type: "heading" }]),
          item([quote([paragraph("quote")])]),
          item([list([item([paragraph("nested")])])]),
          item([list([item([paragraph("ordered")])], true)]),
        ]),
      ]),
    );
    unregister();
  });

  it("applies code fence shortcut inside a list item on enter", () => {
    const { editor, unregister } = createEditor(document([list([item([paragraph("```")])])]));
    selectText(editor, "```");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([list([item([codeBlock("")])])]));
    unregister();
  });
});
