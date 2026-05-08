import { $getRoot, $isTextNode } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { exportEditorStateToMarkdown } from "../../editor-state";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  type SemanticDocument,
} from "../../model";
import {
  createHeadlessMarkdownEditor,
  parseMarkdownWithShortcuts,
} from "../../test-helper/headless-editor-test-utils";
import { doc, list, listItem, p, quote } from "../../test-helper/semantic-builders";
import { applyTaskListShortcutAtSelection } from "./task-list-shortcut";

function applyTaskListShortcut(document: SemanticDocument, marker = "[] ") {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(document, editor);

  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => $isTextNode(node) && node.getTextContent().startsWith(marker));

      if (!textNode) {
        throw new Error("Missing task shortcut marker in test document");
      }

      textNode.select(marker.length, marker.length);
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
    const { markdown, semantic } = applyTaskListShortcut(doc(p("[] ")));

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false })],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [ ]");
  });

  it("creates checked task list from plain text shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut(doc(p("[x] ")), "[x] ");

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [expect.objectContaining({ checked: true })],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [x]");
  });

  it("creates task list from space-bracket marker shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut(doc(p("[ ] todo")), "[ ] ");

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false })],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [ ] todo");
  });

  it("creates task list from unordered list item shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut(
      doc(list(false, listItem(p("[] existing text")))),
    );

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            checked: false,
            children: [p("existing text")],
          }),
        ],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [ ] existing text");
  });

  it("creates checked task list from unordered list item shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut(
      doc(list(false, listItem(p("[x] existing text")))),
      "[x] ",
    );

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            checked: true,
            children: [p("existing text")],
          }),
        ],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe("- [x] existing text");
  });

  it("creates task list from a multi-block list item shortcut without dropping blocks", () => {
    const { markdown, semantic } = applyTaskListShortcut(
      doc(list(false, listItem(p("[] existing text"), quote(p("quote"))))),
    );

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            checked: false,
            children: [p("existing text"), quote(p("quote"))],
          }),
        ],
        ordered: false,
        type: "list",
      }),
    );
    expect(markdown).toBe(["- [ ] existing text", "", "  > quote"].join("\n"));
  });

  it("creates task list from ordered list item shortcut", () => {
    const { markdown, semantic } = applyTaskListShortcut(
      doc(list(true, listItem(p("[] existing text")))),
    );

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
    const { markdown, semantic } = applyTaskListShortcut(
      doc(list(false, listItem(p("A")), listItem(p("[] B")), listItem(p("C")))),
    );

    expect(semantic.children).toEqual([
      expect.objectContaining({
        children: [expect.objectContaining({ children: [p("A")] })],
        ordered: false,
        type: "list",
      }),
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false, children: [p("B")] })],
        ordered: false,
        type: "list",
      }),
      expect.objectContaining({
        children: [expect.objectContaining({ children: [p("C")] })],
        ordered: false,
        type: "list",
      }),
    ]);
    expect(markdown).toBe(["- A", "", "- [ ] B", "", "- C"].join("\n"));
  });

  it("splits ordered list when creating a task list in the middle", () => {
    const { markdown, semantic } = applyTaskListShortcut(
      doc(list(true, listItem(p("A")), listItem(p("[] B")), listItem(p("C")))),
    );

    expect(semantic.children).toEqual([
      expect.objectContaining({ ordered: true, type: "list" }),
      expect.objectContaining({
        children: [expect.objectContaining({ checked: false, children: [p("B")] })],
        ordered: false,
        type: "list",
      }),
      expect.objectContaining({ ordered: true, type: "list" }),
    ]);
    expect(markdown).toBe(["1. A", "", "- [ ] B", "", "1. C"].join("\n"));
  });
});
