import { $generateJSONFromSelectedNodes, $getHtmlContent } from "@lexical/clipboard";
import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";
import {
  $getRoot,
  $isElementNode,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import { collectClipboardAssetUrls } from "./clipboard-assets";
import { exportClipboardNodesToMarkdown } from "./clipboard-formats";

export interface ClipboardExportSnapshot {
  assetUrls: string[];
  html: string;
  imageAssetUrl: string | null;
  markdown: string;
  nodes: ClipboardSerializedNode[];
}

function exportSelectionToHtml(editor: LexicalEditor, selection: BaseSelection): string {
  try {
    return $getHtmlContent(editor, selection);
  } catch {
    return "";
  }
}

function findSingleSelectedImageNode(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
): ClipboardSerializedNode | null {
  if (nodes.length !== 1) {
    return null;
  }

  const [node] = nodes;
  if (node.type === "image") {
    return node;
  }

  if (node.type !== "paragraph" || node.children?.length !== 1) {
    return null;
  }

  const [child] = node.children;
  return child?.type === "image" ? child : null;
}

function getImageAssetUrlForNativeClipboard(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
  includeImageFileUrl: boolean,
): string | null {
  if (!includeImageFileUrl) {
    return null;
  }

  const selectedImageNode = findSingleSelectedImageNode(nodes);
  const selectedImageSrc =
    selectedImageNode && typeof selectedImageNode.src === "string" ? selectedImageNode.src : null;
  return selectedImageSrc?.startsWith("assets://") ? selectedImageSrc : null;
}

function createClipboardExportSnapshot(
  editor: LexicalEditor,
  selection: BaseSelection,
  nodes: ClipboardSerializedNode[],
  imageAssetUrl: string | null,
): ClipboardExportSnapshot | null {
  if (nodes.length === 0) {
    return null;
  }

  return {
    assetUrls: collectClipboardAssetUrls(nodes),
    html: exportSelectionToHtml(editor, selection),
    imageAssetUrl,
    markdown: exportClipboardNodesToMarkdown(nodes),
    nodes,
  };
}

function serializeClipboardNode(node: LexicalNode): ClipboardSerializedNode {
  const serialized = node.exportJSON() as ClipboardSerializedNode;
  if ($isElementNode(node)) {
    serialized.children = node.getChildren().map(serializeClipboardNode);
  }

  return serialized;
}

export function exportClipboardSnapshotFromSelection(
  editor: LexicalEditor,
  selection: BaseSelection,
  options: { includeImageFileUrl: boolean },
): ClipboardExportSnapshot | null {
  if (selection.isCollapsed() || selection.getNodes().length === 0) {
    return null;
  }

  const lexical = $generateJSONFromSelectedNodes<ClipboardSerializedNode>(editor, selection);
  return createClipboardExportSnapshot(
    editor,
    selection,
    lexical.nodes,
    getImageAssetUrlForNativeClipboard(lexical.nodes, options.includeImageFileUrl),
  );
}

export function exportClipboardSnapshotFromDocument(
  editor: LexicalEditor,
  selection: BaseSelection,
): ClipboardExportSnapshot | null {
  return createClipboardExportSnapshot(
    editor,
    selection,
    $getRoot().getChildren().map(serializeClipboardNode),
    null,
  );
}
