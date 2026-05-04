import type { Handle } from "mdast-util-to-markdown";

import type { MdastNode, RawMarkdownMdastNode } from "./syntax-module";

interface PositionedNode {
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
}

export function isRawMarkdownMdastNode(node: unknown): node is RawMarkdownMdastNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as { type: unknown }).type === "rawMarkdown" &&
    "value" in node &&
    typeof (node as { value: unknown }).value === "string"
  );
}

export function getRawMarkdownFromSource(sourceMarkdown: string, node: MdastNode): string | null {
  const positionedNode = node as PositionedNode;
  const start = positionedNode.position?.start?.offset;
  const end = positionedNode.position?.end?.offset;

  if (typeof start !== "number" || typeof end !== "number" || start < 0 || end < start) {
    return null;
  }

  return sourceMarkdown.slice(start, end);
}

export const rawMarkdownHandler: Handle = (node) => {
  if (!isRawMarkdownMdastNode(node)) {
    return "";
  }

  return node.value;
};
