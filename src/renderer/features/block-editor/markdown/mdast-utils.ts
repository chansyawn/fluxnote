import type { BlockContent, Paragraph, PhrasingContent, Root, RootContent } from "mdast";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "./processor";

export function fallbackMarkdown(kind: string): string {
  return `<!-- unsupported:${kind} -->`;
}

export function canonicalMarkdownForNode(node: RootContent): string {
  try {
    return stringifyMdastToMarkdown({ children: [node], type: "root" }).trim();
  } catch {
    return fallbackMarkdown(node.type);
  }
}

export function canonicalMarkdownForInline(node: PhrasingContent): string {
  const paragraph: Paragraph = { children: [node], type: "paragraph" };
  return canonicalMarkdownForNode(paragraph).trim();
}

export function parseOpaqueMarkdown(markdown: string): Root {
  return parseMarkdownToMdast(markdown);
}

export function isFlowBlockContent(node: RootContent): node is BlockContent {
  return (
    node.type === "blockquote" ||
    node.type === "code" ||
    node.type === "definition" ||
    node.type === "footnoteDefinition" ||
    node.type === "heading" ||
    node.type === "html" ||
    node.type === "list" ||
    node.type === "listItem" ||
    node.type === "math" ||
    node.type === "paragraph" ||
    node.type === "table" ||
    node.type === "thematicBreak" ||
    node.type === "yaml"
  );
}

export function isPhrasingContent(node: RootContent): node is PhrasingContent {
  return (
    node.type === "break" ||
    node.type === "delete" ||
    node.type === "emphasis" ||
    node.type === "footnoteReference" ||
    node.type === "html" ||
    node.type === "image" ||
    node.type === "imageReference" ||
    node.type === "inlineCode" ||
    node.type === "inlineMath" ||
    node.type === "link" ||
    node.type === "linkReference" ||
    node.type === "strong" ||
    node.type === "text"
  );
}
