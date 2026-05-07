import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { importMarkdownToEditor } from "../editor-state";
import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import {
  BLOCK_EDITOR_CLIPBOARD_NAMESPACE,
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";

function createEditorWithMarkdown(markdown: string): LexicalEditor {
  const editor = createHeadlessMarkdownEditor("SourceBlockEditor");
  importMarkdownToEditor(editor, markdown);
  return editor;
}

function visitTextNodes(node: LexicalNode, visit: (node: LexicalNode) => boolean): boolean {
  if (visit(node)) {
    return true;
  }

  if (!$isElementNode(node)) {
    return false;
  }

  return node.getChildren().some((child) => visitTextNodes(child, visit));
}

function selectText(editor: LexicalEditor, value: string): void {
  editor.update(
    () => {
      const found = visitTextNodes($getRoot(), (node) => {
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

function lexicalPayload(data: { "application/x-lexical-editor"?: string }) {
  if (data["application/x-lexical-editor"] === undefined) {
    throw new Error("Missing lexical clipboard payload");
  }

  return JSON.parse(data["application/x-lexical-editor"]) as {
    namespace: string;
    nodes: Array<{ type: string }>;
  };
}

describe("block editor clipboard data", () => {
  it("exports the full document for handle copy", () => {
    const editor = createEditorWithMarkdown(["# Title", "", "Text **bold**"].join("\n"));

    const data = createClipboardDataFromDocument(editor);

    expect(data?.["text/plain"]).toBe(["# Title", "", "Text **bold**", ""].join("\n"));
    expect(data?.["text/html"]).toContain("Title");
    expect(lexicalPayload(data ?? { "text/plain": "" })).toMatchObject({
      namespace: BLOCK_EDITOR_CLIPBOARD_NAMESPACE,
      nodes: [{ type: "heading" }, { type: "paragraph" }],
    });
  });

  it("exports selected inline content as markdown", () => {
    const editor = createEditorWithMarkdown("Text **bold** after");
    selectText(editor, "bold");

    const data = createClipboardDataFromCurrentSelection(editor);

    expect(data?.["text/plain"]).toBe("**bold**\n");
    expect(data?.["text/html"]).toContain("bold");
    expect(lexicalPayload(data ?? { "text/plain": "" })).toMatchObject({
      namespace: BLOCK_EDITOR_CLIPBOARD_NAMESPACE,
      nodes: [{ type: "text" }],
    });
  });

  it("does not export collapsed selections", () => {
    const editor = createEditorWithMarkdown("Text");
    selectText(editor, "");

    expect(createClipboardDataFromCurrentSelection(editor)).toBeNull();
  });
});
