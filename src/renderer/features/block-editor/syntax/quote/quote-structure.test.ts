import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createTextNode, $getRoot } from "lexical";
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
import { isEmptyQuote } from "./quote-structure";

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

function roundTripLexical(documentNode: SemanticDocument): SemanticDocument {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(documentNode, editor);
  return exportLexicalToSemanticDocument(editor.getEditorState());
}

describe("quote structure", () => {
  it("preserves multiple paragraph blocks inside a quote", () => {
    const semantic = document([quote([paragraph("A"), paragraph("B")])]);

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("roundtrips nested block children inside a quote", () => {
    const semantic = document([
      quote([
        paragraph("A"),
        list([item([paragraph("B")])]),
        quote([paragraph("C")]),
        codeBlock("const a = 1", "ts"),
      ]),
    ]);

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("wraps raw inline quote children in a paragraph", () => {
    const editor = createHeadlessMarkdownEditor();

    editor.update(
      () => {
        const root = $getRoot();
        const quoteNode = $createQuoteNode();
        root.clear();
        quoteNode.append($createTextNode("raw"));
        root.append(quoteNode);
      },
      { discrete: true },
    );

    expect(exportLexicalToSemanticDocument(editor.getEditorState())).toEqual(
      document([quote([paragraph("raw")])]),
    );
  });

  it("treats empty heading children as empty quote content", () => {
    const editor = createHeadlessMarkdownEditor();
    let isEmpty = false;

    editor.update(
      () => {
        const root = $getRoot();
        const quoteNode = $createQuoteNode();
        root.clear();
        quoteNode.append($createHeadingNode("h1"));
        root.append(quoteNode);
        isEmpty = isEmptyQuote(quoteNode);
      },
      { discrete: true },
    );

    expect(isEmpty).toBe(true);
  });
});
