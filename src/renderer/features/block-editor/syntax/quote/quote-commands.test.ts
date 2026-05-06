import {
  $getSelection,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
} from "../../core/semantic/lexical-adapter";
import type {
  SemanticBlock,
  SemanticBlockquote,
  SemanticCodeBlock,
  SemanticDocument,
  SemanticHeading,
  SemanticList,
  SemanticListItem,
  SemanticParagraph,
} from "../../model";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { registerListKeyboardCommands } from "../list/list-commands";
import { applyTaskListShortcutAtSelection } from "../list/task-list-shortcut-plugin";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../registry";
import { registerQuoteKeyboardCommands } from "./quote-commands";
import { applyQuoteContainerMarkdownShortcutAtSelection } from "./quote-shortcuts";

interface KeyboardEventStub extends KeyboardEvent {
  readonly preventedForTest: boolean;
}

function paragraph(value = ""): SemanticParagraph {
  return {
    children: value.length > 0 ? [{ type: "text", value }] : [],
    type: "paragraph",
  };
}

function heading(value: string, depth: SemanticHeading["depth"] = 1): SemanticHeading {
  return {
    children: [{ type: "text", value }],
    depth,
    type: "heading",
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

function taskItem(children: SemanticBlock[], checked: boolean): SemanticListItem {
  return { checked, children, type: "listItem" };
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

function createEditor(documentNode: SemanticDocument, includeList = false) {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(documentNode, editor);
  const unregisterQuote = registerQuoteKeyboardCommands(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);
  const unregisterList = includeList
    ? registerListKeyboardCommands(editor, MARKDOWN_SHORTCUT_TRANSFORMERS)
    : () => {};

  return {
    editor,
    unregister: () => {
      unregisterList();
      unregisterQuote();
    },
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
      handled = applyQuoteContainerMarkdownShortcutAtSelection(MARKDOWN_SHORTCUT_TRANSFORMERS);
    },
    { discrete: true },
  );
  return handled;
}

describe("quote keyboard", () => {
  it("creates a list from typed shortcut inside a quote without invalid selection", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph()])]), true);
    selectParagraph(editor, "");

    expect(() => insertText(editor, "- ")).not.toThrow();

    expect(semantic(editor)).toEqual(document([quote([list([item([paragraph()])])])]));
    unregister();
  });

  it("creates an ordered list from typed shortcut inside a quote without invalid selection", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph()])]), true);
    selectParagraph(editor, "");

    expect(() => insertText(editor, "1. ")).not.toThrow();

    expect(semantic(editor)).toEqual(document([quote([list([item([paragraph()])], true)])]));
    unregister();
  });

  it("applies list shortcut inside a quote", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph("- nested")])]));
    selectText(editor, "- nested", 2);

    expect(applyShortcut(editor)).toBe(true);

    expect(semantic(editor)).toEqual(document([quote([list([item([paragraph("nested")])])])]));
    unregister();
  });

  it("applies task list shortcut inside a quote", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph("[x] done")])]));
    selectText(editor, "[x] done", 4);

    let handled = false;
    editor.update(
      () => {
        handled = applyTaskListShortcutAtSelection();
      },
      { discrete: true },
    );

    expect(handled).toBe(true);
    expect(semantic(editor)).toEqual(
      document([quote([list([taskItem([paragraph("done")], true)])])]),
    );
    unregister();
  });

  it("applies nested quote shortcut inside a quote", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph("> nested")])]));
    selectText(editor, "> nested", 2);

    expect(applyShortcut(editor)).toBe(true);

    expect(semantic(editor)).toEqual(document([quote([quote([paragraph("nested")])])]));
    unregister();
  });

  it("applies heading shortcut inside a quote", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph("# Title")])]));
    selectText(editor, "# Title", 2);

    expect(applyShortcut(editor)).toBe(true);

    expect(semantic(editor)).toEqual(document([quote([heading("Title")])]));
    unregister();
  });

  it("applies code fence shortcut inside a quote on enter", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph("```")])]));
    selectText(editor, "```");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([quote([codeBlock("")])]));
    unregister();
  });

  it("exits quote from an empty trailing paragraph", () => {
    const { editor, unregister } = createEditor(document([quote([paragraph("A"), paragraph()])]));
    selectParagraph(editor, "");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([quote([paragraph("A")]), paragraph()]));
    unregister();
  });

  it("unwraps quote children at the first block start on backspace", () => {
    const { editor, unregister } = createEditor(
      document([quote([paragraph("A"), paragraph("B")])]),
    );
    selectText(editor, "A", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([paragraph("A"), paragraph("B")]));
    unregister();
  });

  it("exits a code block inside a quote before unwrapping the quote", () => {
    const { editor, unregister } = createEditor(document([quote([codeBlock("const a = 1")])]));
    selectText(editor, "const a = 1", 0);

    expect(dispatchBackspace(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(document([quote([paragraph("const a = 1")])]));
    unregister();
  });

  it("delegates list item enter inside a quote to the list keyboard handler", () => {
    const { editor, unregister } = createEditor(
      document([quote([list([item([paragraph("A")])])])]),
      true,
    );
    selectText(editor, "A");

    expect(dispatchEnter(editor)).toMatchObject({ handled: true, prevented: true });

    expect(semantic(editor)).toEqual(
      document([quote([list([item([paragraph("A")]), item([paragraph()])])])]),
    );
    unregister();
  });
});
