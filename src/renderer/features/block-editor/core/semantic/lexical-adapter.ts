import { $isCodeNode } from "@lexical/code";
import { $isHorizontalRuleNode } from "@lexical/extension";
import { $createLinkNode, $isLinkNode } from "@lexical/link";
import { $isListItemNode, $isListNode } from "@lexical/list";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import {
  $createLineBreakNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from "lexical";

import { codeBlockFromLexical, codeBlockToLexical } from "../../syntax/code/lexical";
import { headingTagToDepth, headingToLexical } from "../../syntax/heading/lexical";
import { listFromLexical, listItemFromLexical, listToLexical } from "../../syntax/list/lexical";
import { paragraphToLexical } from "../../syntax/paragraph/lexical";
import {
  opaqueBlockFromLexical,
  opaqueBlockToLexical,
  opaqueInlineFromLexical,
  opaqueInlineToLexical,
} from "../../syntax/placeholders/lexical";
import { $isPlaceholderBlockNode } from "../../syntax/placeholders/placeholder-block-node";
import { $isPlaceholderInlineNode } from "../../syntax/placeholders/placeholder-inline-node";
import { quoteFromLexical, quoteToLexical } from "../../syntax/quote/lexical";
import {
  thematicBreakFromLexical,
  thematicBreakToLexical,
} from "../../syntax/thematic-break/lexical";
import type { SemanticBlock, SemanticDocument, SemanticInline, SemanticListItem } from "./document";
import { lexicalContainerChildrenToBlocks } from "./lexical-container";
import { normalizeSemanticDocument } from "./normalize";

function applyTextFormats(node: TextNode, formats: ReadonlyArray<TextFormatType>): TextNode {
  for (const format of formats) {
    node.toggleFormat(format);
  }

  return node;
}

function inlineToLexical(
  node: SemanticInline,
  formats: ReadonlyArray<TextFormatType> = [],
): LexicalNode[] {
  switch (node.type) {
    case "text":
      return node.value.length > 0 ? [applyTextFormats($createTextNode(node.value), formats)] : [];
    case "hardBreak":
      return [$createLineBreakNode()];
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
    case "link": {
      const link = $createLinkNode(node.url, { title: node.title });
      link.append(...node.children.flatMap((child) => inlineToLexical(child, formats)));
      return [link];
    }
    case "opaqueInline":
      return [opaqueInlineToLexical(node)];
  }
}

function blockToLexical(node: SemanticBlock): LexicalNode[] {
  switch (node.type) {
    case "paragraph":
      return [paragraphToLexical(node, inlineToLexical)];
    case "heading":
      return [headingToLexical(node, inlineToLexical)];
    case "blockquote":
      return [quoteToLexical(node, blockToLexical)];
    case "list":
      return [listToLexical(node, blockToLexical)];
    case "codeBlock":
      return [codeBlockToLexical(node)];
    case "thematicBreak":
      return [thematicBreakToLexical()];
    case "opaqueBlock":
      return [opaqueBlockToLexical(node)];
  }
}

function textToInline(node: TextNode): SemanticInline[] {
  const value = node.getTextContent();
  if (value.length === 0) {
    return [];
  }

  if (node.hasFormat("code")) {
    return [{ type: "inlineCode", value }];
  }

  let current: SemanticInline = { type: "text", value };
  if (node.hasFormat("strikethrough")) {
    current = { children: [current], type: "delete" };
  }
  if (node.hasFormat("italic")) {
    current = { children: [current], type: "emphasis" };
  }
  if (node.hasFormat("bold")) {
    current = { children: [current], type: "strong" };
  }

  return [current];
}

function inlineFromLexical(node: LexicalNode): SemanticInline[] {
  if ($isTextNode(node)) {
    return textToInline(node);
  }

  if ($isLineBreakNode(node)) {
    return [{ type: "hardBreak" }];
  }

  if ($isLinkNode(node)) {
    return [
      {
        children: childrenToInline(node.getChildren()),
        title: node.getTitle(),
        type: "link",
        url: node.getURL(),
      },
    ];
  }

  if ($isPlaceholderInlineNode(node)) {
    return [opaqueInlineFromLexical(node)];
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
  if (!$isListItemNode(node)) {
    return null;
  }

  return listItemFromLexical(node, containerChildrenToBlocks);
}

function blockFromLexical(node: LexicalNode): SemanticBlock[] {
  if ($isParagraphNode(node)) {
    return [{ children: childrenToInline(node.getChildren()), type: "paragraph" }];
  }

  if ($isHeadingNode(node)) {
    return [
      {
        children: childrenToInline(node.getChildren()),
        depth: headingTagToDepth(node.getTag()),
        type: "heading",
      },
    ];
  }

  if ($isQuoteNode(node)) {
    return [quoteFromLexical(node, containerChildrenToBlocks)];
  }

  if ($isListNode(node)) {
    return [listFromLexical(node, semanticListItemFromLexical)];
  }

  if ($isListItemNode(node)) {
    return [];
  }

  if ($isCodeNode(node)) {
    return [codeBlockFromLexical(node)];
  }

  if ($isHorizontalRuleNode(node)) {
    return [thematicBreakFromLexical(node)];
  }

  if ($isPlaceholderBlockNode(node)) {
    return [opaqueBlockFromLexical(node)];
  }

  if ($isElementNode(node)) {
    return [{ children: childrenToInline(node.getChildren()), type: "paragraph" }];
  }

  return [];
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
