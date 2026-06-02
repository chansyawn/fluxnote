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
} from "lexical";
import type { BlockContent, DefinitionContent, PhrasingContent, Root, RootContent } from "mdast";

import { $isGapCursorParagraph } from "../cursor";
import { stringifyMdastToMarkdown } from "../markdown/processor";
import { codeBlockFromLexical, codeBlockToLexical } from "../syntax/code/lexical";
import { headingFromLexical, headingToLexical } from "../syntax/heading/lexical";
import { listFromLexical, listItemFromLexical, listToLexical } from "../syntax/list/lexical";
import { paragraphFromLexical, paragraphToLexical } from "../syntax/paragraph/lexical";
import { quoteFromLexical, quoteToLexical } from "../syntax/quote/lexical";
import { tableFromLexical, tableToLexical } from "../syntax/table/lexical";
import { thematicBreakFromLexical, thematicBreakToLexical } from "../syntax/thematic-break/lexical";
import { inlineFromLexical, inlineToLexical } from "./inline-lexical-mdast";
import { normalizeMdast } from "./normalize-mdast";

// mdast Blockquote / ListItem children allow definitions and footnote
// definitions in addition to plain block content.
type ContainerChild = BlockContent | DefinitionContent;

// ============================================================================
// mdast → Lexical
// ============================================================================

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

export function rootContentToLexical(node: RootContent): LexicalNode[] {
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

export function blockFromLexical(node: LexicalNode): BlockContent[] {
  if ($isParagraphNode(node)) {
    if ($isGapCursorParagraph(node)) {
      return [];
    }

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
