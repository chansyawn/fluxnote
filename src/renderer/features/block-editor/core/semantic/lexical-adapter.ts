import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $createHorizontalRuleNode, $isHorizontalRuleNode } from "@lexical/extension";
import { $createLinkNode, $isLinkNode } from "@lexical/link";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListType,
} from "@lexical/list";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  $createLineBreakNode,
  $createParagraphNode,
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

import {
  $createPlaceholderBlockNode,
  $isPlaceholderBlockNode,
} from "../../syntax/placeholders/placeholder-block-node";
import {
  $createPlaceholderInlineNode,
  $isPlaceholderInlineNode,
} from "../../syntax/placeholders/placeholder-inline-node";
import type {
  HeadingDepth,
  SemanticBlock,
  SemanticDocument,
  SemanticInline,
  SemanticListItem,
} from "./document";
import { normalizeSemanticDocument } from "./normalize";

function toHeadingTag(depth: HeadingDepth): HeadingTagType {
  return `h${depth}` as HeadingTagType;
}

function toHeadingDepth(tag: HeadingTagType): HeadingDepth {
  return Number(tag.slice(1)) as HeadingDepth;
}

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
      return [$createPlaceholderInlineNode(node.markdown, node.kind, node.metadata)];
  }
}

function blockToLexical(node: SemanticBlock): LexicalNode[] {
  switch (node.type) {
    case "paragraph": {
      const paragraph = $createParagraphNode();
      paragraph.append(...node.children.flatMap((child) => inlineToLexical(child)));
      return [paragraph];
    }
    case "heading": {
      const heading = $createHeadingNode(toHeadingTag(node.depth));
      heading.append(...node.children.flatMap((child) => inlineToLexical(child)));
      return [heading];
    }
    case "blockquote": {
      const quote = $createQuoteNode();
      quote.append(...node.children.flatMap(blockToLexical));
      return [quote];
    }
    case "list": {
      const hasTaskItems = node.children.some((item) => typeof item.checked === "boolean");
      const listType: ListType = node.ordered ? "number" : hasTaskItems ? "check" : "bullet";
      const list = $createListNode(listType, node.ordered ? node.start : 1);
      list.append(...node.children.map((item) => listItemToLexical(item, listType)));
      return [list];
    }
    case "listItem":
      return [listItemToLexical(node, typeof node.checked === "boolean" ? "check" : "bullet")];
    case "codeBlock": {
      const code = $createCodeNode(node.lang ?? undefined);
      code.append($createTextNode(node.value));
      return [code];
    }
    case "thematicBreak":
      return [$createHorizontalRuleNode()];
    case "opaqueBlock":
      return [$createPlaceholderBlockNode(node.markdown, node.kind, node.metadata)];
  }
}

function listItemToLexical(item: SemanticListItem, listType: ListType): LexicalNode {
  const listItem = $createListItemNode(listType === "check" ? item.checked === true : undefined);
  listItem.append(...item.children.flatMap(blockToLexical));
  return listItem;
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
    return [
      {
        kind: node.getKind(),
        markdown: node.getMarkdown(),
        ...(node.getMetadata() ? { metadata: node.getMetadata() } : {}),
        type: "opaqueInline",
      },
    ];
  }

  return [];
}

function childrenToInline(children: ReadonlyArray<LexicalNode>): SemanticInline[] {
  return children.flatMap(inlineFromLexical);
}

function isInlineRuntimeNode(node: LexicalNode): boolean {
  return node.isInline() || $isTextNode(node) || $isLineBreakNode(node);
}

function flushInlineParagraph(
  children: SemanticBlock[],
  inlineBuffer: SemanticInline[],
): SemanticInline[] {
  if (inlineBuffer.length === 0) {
    return inlineBuffer;
  }

  children.push({ children: inlineBuffer, type: "paragraph" });
  return [];
}

function listItemFromLexical(node: LexicalNode): SemanticListItem | null {
  if (!$isListItemNode(node)) {
    return null;
  }

  const children: SemanticBlock[] = [];
  let inlineBuffer: SemanticInline[] = [];

  for (const child of node.getChildren()) {
    if (isInlineRuntimeNode(child)) {
      inlineBuffer.push(...inlineFromLexical(child));
      continue;
    }

    inlineBuffer = flushInlineParagraph(children, inlineBuffer);
    children.push(...blockFromLexical(child));
  }

  flushInlineParagraph(children, inlineBuffer);

  return {
    ...(typeof node.getChecked() === "boolean" ? { checked: node.getChecked() } : {}),
    children,
    type: "listItem",
  };
}

function blockFromLexical(node: LexicalNode): SemanticBlock[] {
  if ($isParagraphNode(node)) {
    return [{ children: childrenToInline(node.getChildren()), type: "paragraph" }];
  }

  if ($isHeadingNode(node)) {
    return [
      {
        children: childrenToInline(node.getChildren()),
        depth: toHeadingDepth(node.getTag()),
        type: "heading",
      },
    ];
  }

  if ($isQuoteNode(node)) {
    return [{ children: node.getChildren().flatMap(blockFromLexical), type: "blockquote" }];
  }

  if ($isListNode(node)) {
    const ordered = node.getListType() === "number";
    const children = node.getChildren().flatMap((child) => {
      const item = listItemFromLexical(child);
      return item ? [item] : [];
    });
    return [{ children, ordered, start: ordered ? node.getStart() : 1, type: "list" }];
  }

  if ($isListItemNode(node)) {
    const item = listItemFromLexical(node);
    return item ? [item] : [];
  }

  if ($isCodeNode(node)) {
    return [
      {
        lang: node.getLanguage() ?? null,
        type: "codeBlock",
        value: node.getTextContent(),
      },
    ];
  }

  if ($isHorizontalRuleNode(node)) {
    return [{ type: "thematicBreak" }];
  }

  if ($isPlaceholderBlockNode(node)) {
    return [
      {
        kind: node.getKind(),
        markdown: node.getMarkdown(),
        ...(node.getMetadata() ? { metadata: node.getMetadata() } : {}),
        type: "opaqueBlock",
      },
    ];
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
