import { $isAutoLinkNode } from "@lexical/link";
import {
  $createTextNode,
  $isLineBreakNode,
  $isTextNode,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import type { Delete, Emphasis, PhrasingContent, Strong, Text } from "mdast";

import { stringifyMdastToMarkdown } from "../markdown/processor";
import { $createSoftBreakNode, $isSoftBreakNode } from "../syntax/break";
import { imageFromLexical, imageToLexical } from "../syntax/image/lexical";
import { linkFromLexical, linkToLexical } from "../syntax/link/lexical";

function applyTextFormats(
  node: ReturnType<typeof $createTextNode>,
  formats: ReadonlyArray<TextFormatType>,
): ReturnType<typeof $createTextNode> {
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

function stringifyAsInline(node: PhrasingContent): string {
  return stringifyMdastToMarkdown({
    children: [{ children: [node], type: "paragraph" }],
    type: "root",
  }).trim();
}

function fallbackInlineText(
  node: PhrasingContent,
  formats: ReadonlyArray<TextFormatType>,
): LexicalNode[] {
  const literal = stringifyAsInline(node);
  return literal ? [applyTextFormats($createTextNode(literal), formats)] : [];
}

export function inlineToLexical(
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

export function inlineFromLexical(node: LexicalNode): PhrasingContent[] {
  if ($isTextNode(node)) {
    return textNodeToInline(node);
  }
  if ($isSoftBreakNode(node)) {
    return [{ type: "text", value: "\n" } satisfies Text];
  }
  if ($isLineBreakNode(node)) {
    return [{ type: "break" }];
  }
  if ($isAutoLinkNode(node)) {
    return node.getChildren().flatMap(inlineFromLexical);
  }

  const link = linkFromLexical(node, inlineFromLexical);
  if (link) return [link];

  const image = imageFromLexical(node);
  if (image) return [image];

  return [];
}
