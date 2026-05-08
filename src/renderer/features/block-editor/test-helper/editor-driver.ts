import {
  $createNodeSelection,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import { exportEditorStateToMarkdown, importMarkdownToEditor } from "../core/markdown-editor-io";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  type SemanticDocument,
} from "../model";
import { $isImageNode } from "../syntax/image";
import { createHeadlessMarkdownEditor } from "./headless-editor-test-utils";

export interface KeyboardEventStub extends KeyboardEvent {
  readonly preventedForTest: boolean;
}

export interface EditorSnapshot {
  markdown: string;
  semantic: SemanticDocument;
}

export function createEditorFromMarkdown(markdown: string, namespace?: string): LexicalEditor {
  const editor = createHeadlessMarkdownEditor(namespace);
  importMarkdownToEditor(editor, markdown);
  return editor;
}

export function createEditorFromSemantic(
  document: SemanticDocument,
  namespace?: string,
): LexicalEditor {
  const editor = createHeadlessMarkdownEditor(namespace);
  importSemanticDocumentToLexical(document, editor);
  return editor;
}

export function readEditorSnapshot(editor: LexicalEditor): EditorSnapshot {
  const editorState = editor.getEditorState();
  return {
    markdown: exportEditorStateToMarkdown(editorState).trimEnd(),
    semantic: exportLexicalToSemanticDocument(editorState),
  };
}

export function visitEditorNodes(
  node: LexicalNode,
  visit: (node: LexicalNode) => boolean,
): boolean {
  if (visit(node)) {
    return true;
  }

  if (!$isElementNode(node)) {
    return false;
  }

  return node.getChildren().some((child) => visitEditorNodes(child, visit));
}

export function selectText(editor: LexicalEditor, value: string): void {
  editor.update(
    () => {
      const found = visitEditorNodes($getRoot(), (node) => {
        if (!$isTextNode(node)) {
          return false;
        }

        const start = node.getTextContent().indexOf(value);
        if (start === -1) {
          return false;
        }

        node.select(start, start + value.length);
        return true;
      });

      if (!found) {
        throw new Error(`Text not found: ${value}`);
      }
    },
    { discrete: true },
  );
}

export function selectFirstImage(editor: LexicalEditor): void {
  editor.update(
    () => {
      let imageKey: string | null = null;

      const found = visitEditorNodes($getRoot(), (node) => {
        if (!$isImageNode(node)) {
          return false;
        }

        imageKey = node.getKey();
        return true;
      });

      if (!found || imageKey === null) {
        throw new Error("Image not found");
      }

      const selection = $createNodeSelection();
      selection.add(imageKey);
      $setSelection(selection);
    },
    { discrete: true },
  );
}

export function createKeyboardEventStub(): KeyboardEventStub {
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

export function selectTextEndAndDispatchEnter(
  editor: LexicalEditor,
  value: string,
): KeyboardEventStub {
  const event = createKeyboardEventStub();
  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => $isTextNode(node) && node.getTextContent() === value);

      if (!textNode) {
        throw new Error(`Missing text node: ${value}`);
      }

      textNode.select(value.length, value.length);
      editor.dispatchCommand(KEY_ENTER_COMMAND, event);
    },
    { discrete: true },
  );
  return event;
}
