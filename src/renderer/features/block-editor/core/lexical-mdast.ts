import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import type {
  BlockContent,
  DefinitionContent,
  Delete,
  Emphasis,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Text,
} from "mdast";

import { stringifyMdastToMarkdown } from "../markdown/processor";
import { $createSoftBreakNode, $isSoftBreakNode } from "../syntax/break";
import { codeBlockFromLexical, codeBlockToLexical } from "../syntax/code/lexical";
import { headingFromLexical, headingToLexical } from "../syntax/heading/lexical";
import { imageFromLexical, imageToLexical } from "../syntax/image/lexical";
import { linkFromLexical, linkToLexical } from "../syntax/link/lexical";
import { listFromLexical, listItemFromLexical, listToLexical } from "../syntax/list/lexical";
import { paragraphFromLexical, paragraphToLexical } from "../syntax/paragraph/lexical";
import { quoteFromLexical, quoteToLexical } from "../syntax/quote/lexical";
import { tableFromLexical, tableToLexical } from "../syntax/table/lexical";
import { thematicBreakFromLexical, thematicBreakToLexical } from "../syntax/thematic-break/lexical";
import { normalizeMdast } from "./normalize-mdast";

// mdast Blockquote / ListItem children allow definitions and footnote
// definitions in addition to plain block content.
type ContainerChild = BlockContent | DefinitionContent;

// ============================================================================
// mdast → Lexical
// ============================================================================

function applyTextFormats(
  node: ReturnType<typeof $createTextNode>,
  formats: ReadonlyArray<TextFormatType>,
) {
  for (const format of formats) {
    node.toggleFormat(format);
  }
  return node;
}

function textValueToLexical(value: string, formats: ReadonlyArray<TextFormatType>): LexicalNode[] {
  const parts = value.split("\n");
  const nodes: LexicalNode[] = [];
  parts.forEach((part, index) => {
    if (index > 0) nodes.push($createSoftBreakNode());
    if (part.length > 0) nodes.push(applyTextFormats($createTextNode(part), formats));
  });
  return nodes;
}

function inlineToLexical(
  node: PhrasingContent,
  formats: ReadonlyArray<TextFormatType> = [],
): LexicalNode[] {
  switch (node.type) {
    case "text":
      return textValueToLexical(node.value, formats);
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
    case "link":
      return [linkToLexical(node, (child) => inlineToLexical(child, formats))];
    case "image":
      return [imageToLexical(node)];
    case "break":
      return [$createSoftBreakNode()];
    default:
      return fallbackInlineText(node, formats);
  }
}

function fallbackInlineText(
  node: PhrasingContent,
  formats: ReadonlyArray<TextFormatType>,
): LexicalNode[] {
  const literal = stringifyAsInline(node);
  return literal ? [applyTextFormats($createTextNode(literal), formats)] : [];
}

function blockToLexical(node: ContainerChild): LexicalNode[] {
  switch (node.type) {
    case "paragraph":
      return [paragraphToLexical(node, (child) => inlineToLexical(child))];
    case "heading":
      return [headingToLexical(node, (child) => inlineToLexical(child))];
    case "blockquote":
      return [quoteToLexical(node, (child) => blockToLexical(child))];
    case "list":
      return [listToLexical(node, (child) => blockToLexical(child))];
    case "table":
      return [tableToLexical(node, (child) => inlineToLexical(child))];
    case "code":
      return [codeBlockToLexical(node)];
    case "thematicBreak":
      return [thematicBreakToLexical()];
    default:
      return [fallbackTextBlock(node as RootContent)];
  }
}

function rootContentToLexical(node: RootContent): LexicalNode[] {
  if (isContainerChild(node)) return blockToLexical(node);
  return [fallbackTextBlock(node)];
}

function fallbackTextBlock(node: RootContent): LexicalNode {
  const paragraph = $createParagraphNode();
  const literal = stringifyAsBlock(node);
  if (literal.length > 0) paragraph.append($createTextNode(literal));
  return paragraph;
}

function stringifyAsBlock(node: RootContent): string {
  const wrapped: Root = isContainerChild(node)
    ? { children: [node], type: "root" }
    : { children: [{ children: [node as PhrasingContent], type: "paragraph" }], type: "root" };
  return stringifyMdastToMarkdown(wrapped).trim();
}

function stringifyAsInline(node: PhrasingContent): string {
  const wrapped: Root = {
    children: [{ children: [node], type: "paragraph" }],
    type: "root",
  };
  return stringifyMdastToMarkdown(wrapped).trim();
}

function isContainerChild(node: RootContent | DefinitionContent): node is ContainerChild {
  return (
    node.type === "blockquote" ||
    node.type === "code" ||
    node.type === "heading" ||
    node.type === "list" ||
    node.type === "paragraph" ||
    node.type === "table" ||
    node.type === "thematicBreak"
  );
}

// ============================================================================
// Lexical → mdast
// ============================================================================

function inlineFromLexical(node: LexicalNode): PhrasingContent[] {
  if ($isTextNode(node)) {
    return textNodeToInline(node);
  }
  if ($isSoftBreakNode(node)) {
    return [{ type: "text", value: "\n" } satisfies Text];
  }
  if ($isLineBreakNode(node)) {
    return [{ type: "break" }];
  }

  const link = linkFromLexical(node, inlineFromLexical);
  if (link) return [link];

  const image = imageFromLexical(node);
  if (image) return [image];

  return [];
}

function textNodeToInline(node: LexicalNode): PhrasingContent[] {
  if (!$isTextNode(node)) return [];

  const value = node.getTextContent();
  if (value.length === 0) return [];

  return value.split("\n").flatMap((part, index): PhrasingContent[] => {
    const inlines: PhrasingContent[] = index > 0 ? [{ type: "text", value: "\n" }] : [];
    if (part.length === 0) return inlines;

    const base: PhrasingContent = node.hasFormat("code")
      ? { type: "inlineCode", value: part }
      : ({ type: "text", value: part } satisfies Text);
    inlines.push(wrapWithFormats(base, node));
    return inlines;
  });
}

function wrapWithFormats(inline: PhrasingContent, textNode: LexicalNode): PhrasingContent {
  if (!$isTextNode(textNode)) return inline;

  let current = inline;
  if (textNode.hasFormat("bold")) {
    current = { children: [current], type: "strong" } satisfies Strong;
  }
  if (textNode.hasFormat("italic")) {
    current = { children: [current], type: "emphasis" } satisfies Emphasis;
  }
  if (textNode.hasFormat("strikethrough")) {
    current = { children: [current], type: "delete" } satisfies Delete;
  }
  return current;
}

function blockFromLexical(node: LexicalNode): BlockContent[] {
  if ($isParagraphNode(node)) {
    const result = paragraphFromLexical(node, inlineFromLexical);
    return result ? [result] : [];
  }

  const heading = headingFromLexical(node, inlineFromLexical);
  if (heading) return [heading];

  const quote = quoteFromLexical(node, containerChildrenToBlocks);
  if (quote) return [quote];

  const list = listFromLexical(node, (child) =>
    listItemFromLexical(child, containerChildrenToBlocks),
  );
  if (list) return [list];

  const table = tableFromLexical(node, inlineFromLexical);
  if (table) return [table];

  const code = codeBlockFromLexical(node);
  if (code) return [code];

  const tb = thematicBreakFromLexical(node);
  if (tb) return [tb];

  // ListItemNode at root scope is consumed by ListNode; ignore stray.
  return [];
}

// QuoteNode and ListItemNode in Lexical can hold a mix of inline and block
// children (e.g. a bare TextNode sibling of a ParagraphNode), but mdast
// blockquotes / list items require all children to be block-level. Buffer any
// adjacent inline runtime nodes into a synthetic paragraph before emitting.
function containerChildrenToBlocks(children: ReadonlyArray<LexicalNode>): BlockContent[] {
  const blocks: BlockContent[] = [];
  let inlineBuffer: PhrasingContent[] = [];

  const flush = () => {
    if (inlineBuffer.length === 0) return;
    blocks.push({ children: inlineBuffer, type: "paragraph" });
    inlineBuffer = [];
  };

  for (const child of children) {
    if (isInlineRuntime(child)) {
      inlineBuffer.push(...inlineFromLexical(child));
      continue;
    }
    flush();
    blocks.push(...blockFromLexical(child));
  }
  flush();
  return blocks;
}

// `isInline()` on Lexical nodes returns true for inline-positioned nodes, but
// TextNode and LineBreakNode report `false` despite always sitting inline.
function isInlineRuntime(node: LexicalNode): boolean {
  return node.isInline() || $isTextNode(node) || $isLineBreakNode(node);
}

// ============================================================================
// Public API
// ============================================================================

export function importMdastToLexical(mdast: Root, editor: LexicalEditor): void {
  const normalized = normalizeMdast(mdast);
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.append(...normalized.children.flatMap(rootContentToLexical));
    },
    { discrete: true },
  );
}

export function exportLexicalToMdast(editorState: EditorState): Root {
  let root: Root = { children: [], type: "root" };
  editorState.read(() => {
    root = normalizeMdast({
      children: $getRoot().getChildren().flatMap(blockFromLexical),
      type: "root",
    });
  });
  return root;
}
