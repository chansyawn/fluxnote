import { $getRoot, $isTextNode } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { exportEditorStateToMarkdown } from "../../core/editor-state";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
} from "../../core/semantic/lexical-adapter";
import type { SemanticDocument, SemanticParagraph } from "../../model";
import {
  createHeadlessMarkdownEditor,
  parseMarkdownWithShortcuts,
} from "../../test-helper/headless-editor-test-utils";
import { applyTaskListShortcutAtSelection } from "./task-list-shortcut-plugin";

function textParagraph(value: string): SemanticParagraph {
  return {
    children: [{ type: "text", value }],
    type: "paragraph",
  };
}

function applyTaskListShortcut(document: SemanticDocument) {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(document, editor);

  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => $isTextNode(node) && node.getTextContent().startsWith("[] "));

      if (!textNode) {
        throw new Error("Missing task shortcut marker in test document");
      }

      textNode.select(3, 3);
      expect(applyTaskListShortcutAtSelection()).toBe(true);
    },
    { discrete: true },
  );

  const editorState = editor.getEditorState();
  return {
    markdown: exportEditorStateToMarkdown(editorState).trimEnd(),
    semantic: exportLexicalToSemanticDocument(editorState),
  };
}

describe("list shortcut", () => {
  it("parses ordered and unordered list", () => {
    expect(parseMarkdownWithShortcuts("- Bullet").children[0]).toMatchObject({
      ordered: false,
      type: "list",
    });
    expect(parseMarkdownWithShortcuts("1. Ordered").children[0]).toMatchObject({
      ordered: true,
      type: "list",
    });
  });

  it("parses task list checked state", () => {
    expect(parseMarkdownWithShortcuts("- [x] Done").children[0]).toMatchObject({
      children: [expect.objectContaining({ checked: true })],
      type: "list",
    });
    expect(parseMarkdownWithShortcuts("- [ ] Todo").children[0]).toMatchObject({
      children: [expect.objectContaining({ checked: false })],
      type: "list",
    });
  });

  it("creates task list from plain text shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut({
      children: [textParagraph("[] ")],
      type: "root",
    });

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false })],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [ ]");
  });

  it("creates task list from unordered list item shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut({
      children: [
        {
          children: [
            {
              children: [textParagraph("[] existing text")],
              type: "listItem",
            },
          ],
          ordered: false,
          type: "list",
        },
      ],
      type: "root",
    });

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            checked: false,
            children: [textParagraph("existing text")],
          }),
        ],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [ ] existing text");
  });

  it("creates task list from ordered list item shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut({
      children: [
        {
          children: [
            {
              children: [textParagraph("[] existing text")],
              type: "listItem",
            },
          ],
          ordered: true,
          type: "list",
        },
      ],
      type: "root",
    });

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false })],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [ ] existing text");
  });

  it("splits unordered list when creating a task list in the middle", () => {
    const { markdown, semantic } = applyTaskListShortcut({
      children: [
        {
          children: [
            { children: [textParagraph("A")], type: "listItem" },
            { children: [textParagraph("[] B")], type: "listItem" },
            { children: [textParagraph("C")], type: "listItem" },
          ],
          ordered: false,
          type: "list",
        },
      ],
      type: "root",
    });

    expect(semantic.children).toEqual([
      expect.objectContaining({
        children: [expect.objectContaining({ children: [textParagraph("A")] })],
        ordered: false,
        type: "list",
      }),
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false, children: [textParagraph("B")] })],
        ordered: false,
        type: "list",
      }),
      expect.objectContaining({
        children: [expect.objectContaining({ children: [textParagraph("C")] })],
        ordered: false,
        type: "list",
      }),
    ]);
    expect(markdown).toBe(["- A", "", "- [ ] B", "", "- C"].join("\n"));
  });

  it("splits ordered list when creating a task list in the middle", () => {
    const { markdown, semantic } = applyTaskListShortcut({
      children: [
        {
          children: [
            { children: [textParagraph("A")], type: "listItem" },
            { children: [textParagraph("[] B")], type: "listItem" },
            { children: [textParagraph("C")], type: "listItem" },
          ],
          ordered: true,
          type: "list",
        },
      ],
      type: "root",
    });

    expect(semantic.children).toEqual([
      expect.objectContaining({ ordered: true, type: "list" }),
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false, children: [textParagraph("B")] })],
        ordered: false,
        type: "list",
      }),
      expect.objectContaining({ ordered: true, type: "list" }),
    ]);
    expect(markdown).toBe(["1. A", "", "- [ ] B", "", "1. C"].join("\n"));
  });
});
