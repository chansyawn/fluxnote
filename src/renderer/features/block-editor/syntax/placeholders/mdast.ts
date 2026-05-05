import type { BlockContent, Paragraph, PhrasingContent, RootContent } from "mdast";

import {
  canonicalMarkdownForInline,
  canonicalMarkdownForNode,
  isFlowBlockContent,
  isPhrasingContent,
  parseOpaqueMarkdown,
} from "../../markdown/mdast-utils";
import type { SemanticOpaqueBlock, SemanticOpaqueInline } from "../../model";

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
  return parsed.children.filter(isFlowBlockContent);
}

export function opaqueInlineToMdast(node: SemanticOpaqueInline): PhrasingContent[] {
  const parsed = parseOpaqueMarkdown(node.markdown);
  const first = parsed.children[0];

  if (first?.type === "paragraph") {
    return first.children;
  }

  if (first && isPhrasingContent(first)) {
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
