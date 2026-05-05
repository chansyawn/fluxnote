import type { BlockContent, Paragraph, PhrasingContent, RootContent } from "mdast";

import type { SemanticOpaqueBlock, SemanticOpaqueInline } from "../../core/semantic/document";
import {
  canonicalMarkdownForInline,
  canonicalMarkdownForNode,
  isBlockContent,
  isPhrasingContentInInlineContext,
  parseOpaqueMarkdown,
} from "../../core/semantic/mdast-utils";

export function opaqueBlockFromMdast(node: RootContent): SemanticOpaqueBlock {
  return {
    kind: node.type,
    markdown: canonicalMarkdownForNode(node),
    type: "opaqueBlock",
  };
}

export function opaqueInlineFromMdast(node: PhrasingContent): SemanticOpaqueInline {
  return {
    kind: node.type,
    markdown: canonicalMarkdownForInline(node),
    type: "opaqueInline",
  };
}

export function opaqueBlockToMdast(node: SemanticOpaqueBlock): BlockContent[] {
  const parsed = parseOpaqueMarkdown(node.markdown);
  return parsed.children.filter(isBlockContent);
}

export function opaqueInlineToMdast(node: SemanticOpaqueInline): PhrasingContent[] {
  const parsed = parseOpaqueMarkdown(node.markdown);
  const first = parsed.children[0];

  if (first?.type === "paragraph") {
    return first.children;
  }

  if (first && isPhrasingContentInInlineContext(first)) {
    return [first];
  }

  return [{ type: "inlineCode", value: node.markdown.trim() }];
}

export function opaqueInlineFallbackParagraph(markdown: string): Paragraph {
  return {
    children: [{ type: "inlineCode", value: markdown }],
    type: "paragraph",
  };
}
