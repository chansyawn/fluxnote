import {
  $getRoot,
  $isTextNode,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type TextNode,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  type SemanticBlock,
  type SemanticCodeBlock,
  type SemanticDocument,
  type SemanticList,
  type SemanticListItem,
  type SemanticParagraph,
} from "../../model";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { registerListKeyboardCommands } from "../list/list-commands";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../registry";
import { registerCodeKeyboardCommands } from "./code-keyboard-plugin";

interface KeyboardEventStub extends KeyboardEvent {
  readonly preventedForTest: boolean;
}

function paragraph(value = ""): SemanticParagraph {
  return {
    children: value.length > 0 ? [{ type: "text", value }] : [],
    type: "paragraph",
  };
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

function createEditor(documentNode: SemanticDocument, includeListCommands = false) {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(documentNode, editor);
  const unregisterCode = registerCodeKeyboardCommands(editor);
  const unregisterList = includeListCommands
    ? registerListKeyboardCommands(editor, MARKDOWN_SHORTCUT_TRANSFORMERS)
    : () => {};

  return {
    editor,
    unregister: () => {
      unregisterList();
      unregisterCode();
    },
  };
}

function semantic(editor: LexicalEditor): SemanticDocument {
  return exportLexicalToSemanticDocument(editor.getEditorState());
}

function findTextNode(text: string): TextNode {
  const node = $getRoot()
    .getAllTextNodes()
    .find((candidate) => $isTextNode(candidate) && candidate.getTextContent() === text);
  if (!node) {
    throw new Error(`Missing text node "${text}"`);
  }
  return node;
}

function selectText(editor: LexicalEditor, text: string, offset: number): void {
  editor.update(
    () => {
      findTextNode(text).select(offset, offset);
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

describe("code keyboard plugin", () => {
  it("inserts a paragraph before code from alt enter at the start", () => {
    const { editor, unregister } = createEditor(document([codeBlock("const a = 1", "ts")]));
    selectText(editor, "const a = 1", 0);

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(document([paragraph(), codeBlock("const a = 1", "ts")]));
    unregister();
  });

  it("inserts a paragraph after code from alt enter at the end", () => {
    const { editor, unregister } = createEditor(document([codeBlock("const a = 1", "ts")]));
    selectText(editor, "const a = 1", "const a = 1".length);

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(document([codeBlock("const a = 1", "ts"), paragraph()]));
    unregister();
  });

  it("splits code into two code blocks from alt enter in the middle", () => {
    const { editor, unregister } = createEditor(document([codeBlock("alpha beta", "ts")]));
    selectText(editor, "alpha beta", 6);

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([codeBlock("alpha ", "ts"), codeBlock("beta", "ts")]),
    );
    unregister();
  });

  it("splits code inside a list item without creating a sibling item", () => {
    const { editor, unregister } = createEditor(
      document([list([item([paragraph("before"), codeBlock("alpha beta", "ts")])])]),
      true,
    );
    selectText(editor, "alpha beta", 6);

    expect(dispatchEnter(editor, { altKey: true })).toMatchObject({
      handled: true,
      prevented: true,
    });

    expect(semantic(editor)).toEqual(
      document([
        list([item([paragraph("before"), codeBlock("alpha ", "ts"), codeBlock("beta", "ts")])]),
      ]),
    );
    unregister();
  });

  it("delegates plain enter inside code", () => {
    const source = document([codeBlock("const a = 1", "ts")]);
    const { editor, unregister } = createEditor(source);
    selectText(editor, "const a = 1", 5);

    expect(dispatchEnter(editor)).toMatchObject({ handled: false, prevented: false });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });

  it("delegates shift enter inside code", () => {
    const source = document([codeBlock("const a = 1", "ts")]);
    const { editor, unregister } = createEditor(source);
    selectText(editor, "const a = 1", 5);

    expect(dispatchEnter(editor, { altKey: true, shiftKey: true })).toMatchObject({
      handled: false,
      prevented: false,
    });
    expect(semantic(editor)).toEqual(source);
    unregister();
  });
});
