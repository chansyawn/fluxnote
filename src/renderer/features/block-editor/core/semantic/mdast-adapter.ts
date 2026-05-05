import type {
  BlockContent,
  Break,
  InlineCode,
  PhrasingContent,
  Root,
  RootContent,
  Text,
} from "mdast";

import { codeBlockFromMdast, codeBlockToMdast } from "../../syntax/code/mdast";
import { headingFromMdast, headingToMdast } from "../../syntax/heading/mdast";
import {
  deleteFromMdast,
  deleteToMdast,
  emphasisFromMdast,
  emphasisToMdast,
  strongFromMdast,
  strongToMdast,
} from "../../syntax/inline-mark/mdast";
import { linkFromMdast, linkToMdast } from "../../syntax/link/mdast";
import { listFromMdast, listToMdast } from "../../syntax/list/mdast";
import { paragraphFromMdast, paragraphToMdast } from "../../syntax/paragraph/mdast";
import {
  opaqueBlockFromMdast,
  opaqueBlockToMdast,
  opaqueInlineFromMdast,
  opaqueInlineToMdast,
  opaqueInlineFallbackParagraph,
} from "../../syntax/placeholders/mdast";
import { quoteFromMdast, quoteToMdast } from "../../syntax/quote/mdast";
import { thematicBreakFromMdast, thematicBreakToMdast } from "../../syntax/thematic-break/mdast";
import type { SemanticBlock, SemanticDocument, SemanticInline } from "./document";
import { normalizeSemanticDocument } from "./normalize";

function inlineFromMdast(node: PhrasingContent): SemanticInline[] {
  switch (node.type) {
    case "text":
      return [{ type: "text", value: node.value }];
    case "break":
      return [{ type: "hardBreak" }];
    case "emphasis":
      return [emphasisFromMdast(node, inlinesFromMdast)];
    case "strong":
      return [strongFromMdast(node, inlinesFromMdast)];
    case "delete":
      return [deleteFromMdast(node, inlinesFromMdast)];
    case "inlineCode":
      return [{ type: "inlineCode", value: node.value }];
    case "link":
      return [linkFromMdast(node, inlinesFromMdast)];
    default:
      return [opaqueInlineFromMdast(node)];
  }
}

function inlinesFromMdast(children: ReadonlyArray<PhrasingContent>): SemanticInline[] {
  return children.flatMap(inlineFromMdast);
}

function blockFromMdast(node: RootContent): SemanticBlock[] {
  switch (node.type) {
    case "paragraph":
      return [paragraphFromMdast(node, inlinesFromMdast)];
    case "heading":
      return [headingFromMdast(node, inlinesFromMdast)];
    case "blockquote":
      return [quoteFromMdast(node, blocksFromMdast)];
    case "list":
      return [listFromMdast(node, blocksFromMdast)];
    case "listItem":
      return [];
    case "code":
      return [codeBlockFromMdast(node)];
    case "thematicBreak":
      return [thematicBreakFromMdast()];
    default:
      return [opaqueBlockFromMdast(node)];
  }
}

function blocksFromMdast(children: ReadonlyArray<RootContent>): SemanticBlock[] {
  return children.flatMap(blockFromMdast);
}

function inlineToMdast(node: SemanticInline): PhrasingContent[] {
  switch (node.type) {
    case "text":
      return [{ type: "text", value: node.value } satisfies Text];
    case "hardBreak":
      return [{ type: "break" } satisfies Break];
    case "emphasis":
      return [emphasisToMdast(node, inlinesToMdast)];
    case "strong":
      return [strongToMdast(node, inlinesToMdast)];
    case "delete":
      return [deleteToMdast(node, inlinesToMdast)];
    case "inlineCode":
      return [{ type: "inlineCode", value: node.value } satisfies InlineCode];
    case "link":
      return [linkToMdast(node, inlinesToMdast)];
    case "opaqueInline":
      return opaqueInlineToMdast(node);
  }
}

function inlinesToMdast(children: ReadonlyArray<SemanticInline>): PhrasingContent[] {
  return children.flatMap(inlineToMdast);
}

function blockToMdast(node: SemanticBlock): BlockContent[] {
  switch (node.type) {
    case "paragraph":
      return [paragraphToMdast(node, inlinesToMdast)];
    case "heading":
      return [headingToMdast(node, inlinesToMdast)];
    case "blockquote":
      return [quoteToMdast(node, blocksToMdast)];
    case "list":
      return [listToMdast(node, blocksToMdast)];
    case "codeBlock":
      return [codeBlockToMdast(node)];
    case "thematicBreak":
      return [thematicBreakToMdast()];
    case "opaqueBlock": {
      const parsed = opaqueBlockToMdast(node);
      return parsed.length > 0 ? parsed : [opaqueInlineFallbackParagraph(node.markdown)];
    }
  }
}

function blocksToMdast(children: ReadonlyArray<SemanticBlock>): BlockContent[] {
  return children.flatMap(blockToMdast);
}

export function mdastToSemanticDocument(root: Root): SemanticDocument {
  return normalizeSemanticDocument({
    children: blocksFromMdast(root.children),
    type: "root",
  });
}

export function semanticDocumentToMdast(document: SemanticDocument): Root {
  const normalized = normalizeSemanticDocument(document);
  return {
    children: blocksToMdast(normalized.children),
    type: "root",
  };
}
