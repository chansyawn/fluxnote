import { $createQuoteNode } from "@lexical/rich-text";
import { $createTextNode, $getRoot } from "lexical";
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
  SemanticList,
  SemanticListItem,
  SemanticParagraph,
} from "../../model";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../registry";
import { registerQuoteKeyboardCommands } from "./quote-commands";

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
    const unregister = registerQuoteKeyboardCommands(editor, MARKDOWN_SHORTCUT_TRANSFORMERS);

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
    unregister();
  });
});
