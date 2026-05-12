import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  type AutoLinkNode,
  type LinkNode,
} from "@lexical/link";
import { $getNodeByKey, type LexicalEditor, type LexicalNode, type NodeKey } from "lexical";

export interface LinkTarget {
  key: NodeKey;
  kind: "autolink" | "link";
  text: string;
  url: string;
}

function unwrapLinkNode(node: LinkNode): void {
  for (const child of node.getChildren()) {
    node.insertBefore(child);
  }
  node.remove();
}

function replaceAutoLinkWithMarkdownLink(node: AutoLinkNode): void {
  const link = $createLinkNode(node.getURL(), {
    rel: node.getRel(),
    target: node.getTarget(),
    title: node.getTitle(),
  });
  link.append(...node.getChildren());
  node.replace(link);
}

export function findLinkAncestor(
  node: LexicalNode | null | undefined,
): LinkNode | AutoLinkNode | null {
  let current: LexicalNode | null | undefined = node;
  while (current) {
    if ($isLinkNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

export function readLinkTarget(node: LinkNode | AutoLinkNode): LinkTarget {
  return {
    key: node.getKey(),
    kind: $isAutoLinkNode(node) ? "autolink" : "link",
    text: node.getTextContent(),
    url: node.getURL(),
  };
}

export function updateMarkdownLinkUrl(editor: LexicalEditor, key: NodeKey, url: string): void {
  editor.update(
    () => {
      const node = $getNodeByKey(key);
      if ($isLinkNode(node) && !$isAutoLinkNode(node)) {
        node.setURL(url);
      }
    },
    { discrete: true },
  );
}

export function removeMarkdownLink(editor: LexicalEditor, key: NodeKey): void {
  editor.update(
    () => {
      const node = $getNodeByKey(key);
      if ($isLinkNode(node) && !$isAutoLinkNode(node)) {
        unwrapLinkNode(node);
      }
    },
    { discrete: true },
  );
}

export function convertAutoLinkToMarkdownLink(editor: LexicalEditor, key: NodeKey): void {
  editor.update(
    () => {
      const node = $getNodeByKey(key);
      if ($isAutoLinkNode(node)) {
        replaceAutoLinkWithMarkdownLink(node);
      }
    },
    { discrete: true },
  );
}
