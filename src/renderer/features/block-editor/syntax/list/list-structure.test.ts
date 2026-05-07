import { describe, expect, it } from "vite-plus/test";

import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
  type SemanticBlock,
  type SemanticDocument,
  type SemanticListItem,
  type SemanticParagraph,
} from "../../model";
import {
  createHeadlessMarkdownEditor,
  markdownToSemantic,
} from "../../test-helper/headless-editor-test-utils";

function paragraph(value = ""): SemanticParagraph {
  return {
    children: value.length > 0 ? [{ type: "text", value }] : [],
    type: "paragraph",
  };
}

function item(children: SemanticBlock[]): SemanticListItem {
  return { children, type: "listItem" };
}

function roundTripLexical(document: SemanticDocument): SemanticDocument {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(document, editor);
  return exportLexicalToSemanticDocument(editor.getEditorState());
}

describe("list structure", () => {
  it("preserves multiple paragraph blocks inside a list item", () => {
    const semantic: SemanticDocument = {
      children: [
        {
          children: [item([paragraph("A"), paragraph("B")])],
          ordered: false,
          type: "list",
        },
      ],
      type: "root",
    };

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("roundtrips list item paragraph and quote blocks from markdown", () => {
    const semantic = markdownToSemantic(["- A", "", "  > quote"].join("\n"));

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("roundtrips list item code blocks from markdown", () => {
    const semantic = markdownToSemantic(
      ["- A", "", "  ```ts", "  const a = 1;", "  ```"].join("\n"),
    );

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("roundtrips nested list blocks from markdown", () => {
    const semantic = markdownToSemantic(["- A", "  - B", "  - C"].join("\n"));

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });
});
