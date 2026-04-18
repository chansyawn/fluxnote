import { $generateJSONFromSelectedNodes } from "@lexical/clipboard";
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import { $isNoteEditorImageNode } from "../image/note-editor-image-node";
import type {
  ClipboardCopyScope,
  ClipboardImageReference,
  ClipboardSnapshot,
  SerializedClipboardNode,
} from "./note-editor-clipboard-types";

export function collectClipboardSnapshot(
  editor: LexicalEditor,
  scope: ClipboardCopyScope,
): ClipboardSnapshot | null {
  if (scope === "document") {
    return collectDocumentClipboardSnapshot();
  }

  const selection = $getSelection();
  if (!selection) {
    return null;
  }

  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    return null;
  }

  if (!$isRangeSelection(selection) && !$isNodeSelection(selection)) {
    return null;
  }

  const serializedData = $generateJSONFromSelectedNodes(editor, selection);
  const serializedNodes = serializedData.nodes as SerializedClipboardNode[] | undefined;
  if (!serializedNodes || serializedNodes.length === 0) {
    return null;
  }

  return {
    serializedNodes,
    singleSelectedImage: getSingleSelectedImageReference(selection, selection.getNodes()),
  };
}

function collectDocumentClipboardSnapshot(): ClipboardSnapshot {
  const rootChildren = $getRoot().getChildren();

  return {
    serializedNodes: serializeClipboardNodes(rootChildren),
    singleSelectedImage: getSingleSelectedImageReference(null, rootChildren),
  };
}

function serializeClipboardNodes(nodes: readonly LexicalNode[]): SerializedClipboardNode[] {
  return nodes.map((node) => serializeClipboardNode(node));
}

function serializeClipboardNode(node: LexicalNode): SerializedClipboardNode {
  const serializedNode = node.exportJSON() as SerializedClipboardNode;

  if ($isElementNode(node)) {
    serializedNode.children = serializeClipboardNodes(node.getChildren());
  }

  return serializedNode;
}

function getSingleSelectedImageReference(
  selection: BaseSelection | null,
  nodes: readonly LexicalNode[],
): ClipboardImageReference | null {
  if (selection && selection.getNodes().length !== 1) {
    return null;
  }

  if (nodes.length !== 1) {
    return null;
  }

  const [singleNode] = nodes;
  if (!$isNoteEditorImageNode(singleNode)) {
    return null;
  }

  return {
    altText: singleNode.getAltText(),
    blockId: singleNode.getBlockId(),
    src: singleNode.getSrc(),
  };
}
