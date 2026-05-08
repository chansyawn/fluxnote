import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from "lexical";

import type { SyntaxLexicalContext } from "../syntax/registration";
import { SYNTAX_REGISTRATIONS } from "../syntax/registry";
import type { SemanticBlock, SemanticDocument, SemanticInline, SemanticListItem } from "./document";
import { lexicalContainerChildrenToBlocks } from "./lexical-container";
import { normalizeSemanticDocument } from "./normalize";

function applyTextFormats(node: TextNode, formats: ReadonlyArray<TextFormatType>): TextNode {
  for (const format of formats) {
    node.toggleFormat(format);
  }

  return node;
}

function textToLexicalNodes(value: string, formats: ReadonlyArray<TextFormatType>): LexicalNode[] {
  const parts = value.split("\n");
  const nodes: LexicalNode[] = [];

  parts.forEach((part, index) => {
    if (index > 0) {
      nodes.push(...inlineToLexical({ type: "softBreak" }, formats));
    }

    if (part.length > 0) {
      nodes.push(applyTextFormats($createTextNode(part), formats));
    }
  });

  return nodes;
}

function inlineToLexical(
  node: SemanticInline,
  formats: ReadonlyArray<TextFormatType> = [],
): LexicalNode[] {
  switch (node.type) {
    case "text":
      return textToLexicalNodes(node.value, formats);
    case "emphasis":
      return node.children.flatMap((child) => inlineToLexical(child, [...formats, "italic"]));
    case "strong":
      return node.children.flatMap((child) => inlineToLexical(child, [...formats, "bold"]));
    case "delete":
      return node.children.flatMap((child) =>
        inlineToLexical(child, [...formats, "strikethrough"]),
      );
    case "inlineCode":
      return [applyTextFormats($createTextNode(node.value), [...formats, "code"])];
    default:
      break;
  }

  const context = createLexicalContext(formats);
  for (const syntax of SYNTAX_REGISTRATIONS) {
    const lexical = syntax.lexical?.toInline?.(node, context);
    if (lexical !== undefined && lexical !== null) {
      return lexical;
    }
  }

  return [];
}

function blockToLexical(node: SemanticBlock): LexicalNode[] {
  const context = createLexicalContext();
  for (const syntax of SYNTAX_REGISTRATIONS) {
    const lexical = syntax.lexical?.toBlock?.(node, context);
    if (lexical !== undefined && lexical !== null) {
      return lexical;
    }
  }

  return [];
}

function applyInlineFormats(node: SemanticInline, textNode: TextNode): SemanticInline {
  let current = node;
  if (textNode.hasFormat("bold")) {
    current = { children: [current], type: "strong" };
  }
  if (textNode.hasFormat("italic")) {
    current = { children: [current], type: "emphasis" };
  }
  if (textNode.hasFormat("strikethrough")) {
    current = { children: [current], type: "delete" };
  }

  return current;
}

function textToInline(node: TextNode): SemanticInline[] {
  const value = node.getTextContent();
  if (value.length === 0) {
    return [];
  }

  return value.split("\n").flatMap((part, index): SemanticInline[] => {
    const inlines: SemanticInline[] = index > 0 ? [{ type: "softBreak" }] : [];
    if (part.length === 0) {
      return inlines;
    }

    const textInline: SemanticInline = node.hasFormat("code")
      ? { type: "inlineCode", value: part }
      : { type: "text", value: part };
    inlines.push(applyInlineFormats(textInline, node));
    return inlines;
  });
}

function inlineFromLexical(node: LexicalNode): SemanticInline[] {
  if ($isTextNode(node)) {
    return textToInline(node);
  }

  const context = createLexicalContext();
  for (const syntax of SYNTAX_REGISTRATIONS) {
    const semantic = syntax.lexical?.fromInline?.(node, context);
    if (semantic !== undefined && semantic !== null) {
      return semantic;
    }
  }

  return [];
}

function childrenToInline(children: ReadonlyArray<LexicalNode>): SemanticInline[] {
  return children.flatMap(inlineFromLexical);
}

function containerChildrenToBlocks(children: ReadonlyArray<LexicalNode>): SemanticBlock[] {
  return lexicalContainerChildrenToBlocks({
    blockFromLexical,
    children,
    inlineFromLexical,
  });
}

function semanticListItemFromLexical(node: LexicalNode): SemanticListItem | null {
  const context = createLexicalContext();
  for (const syntax of SYNTAX_REGISTRATIONS) {
    const semantic = syntax.lexical?.fromListItem?.(node, context);
    if (semantic !== undefined && semantic !== null) {
      return semantic;
    }
  }

  return null;
}

function blockFromLexical(node: LexicalNode): SemanticBlock[] {
  const context = createLexicalContext();
  for (const syntax of SYNTAX_REGISTRATIONS) {
    const semantic = syntax.lexical?.fromBlock?.(node, context);
    if (semantic !== undefined && semantic !== null) {
      return semantic;
    }
  }

  if ($isElementNode(node)) {
    return [{ children: childrenToInline(node.getChildren()), type: "paragraph" }];
  }

  return [];
}

function createLexicalContext(formats: ReadonlyArray<TextFormatType> = []): SyntaxLexicalContext {
  return {
    readContainerChildren: containerChildrenToBlocks,
    readInlines: childrenToInline,
    readListItem: semanticListItemFromLexical,
    writeBlock: blockToLexical,
    writeInline: (node) => inlineToLexical(node, formats),
  };
}

export function importSemanticDocumentToLexical(
  document: SemanticDocument,
  editor: LexicalEditor,
): void {
  const normalized = normalizeSemanticDocument(document);

  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.append(...normalized.children.flatMap(blockToLexical));
    },
    { discrete: true },
  );
}

export function exportLexicalToSemanticDocument(editorState: EditorState): SemanticDocument {
  let document: SemanticDocument = { children: [], type: "root" };

  editorState.read(() => {
    document = normalizeSemanticDocument({
      children: $getRoot().getChildren().flatMap(blockFromLexical),
      type: "root",
    });
  });

  return document;
}
