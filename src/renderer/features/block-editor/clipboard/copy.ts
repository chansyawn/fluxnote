import { $generateJSONFromSelectedNodes } from "@lexical/clipboard";
import { withDOM } from "@lexical/headless/dom";
import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "../core/types";
import { filterGapCursorNodes } from "../cursor";
import { normalizeExternalMarkdown } from "../markdown/external-markdown";
import {
  collectClipboardAssetUrls,
  rewriteClipboardAssetsForExternalFormats,
} from "./asset-rewrites";
import { exportClipboardNodesToHtml, exportClipboardNodesToMarkdown } from "./formats";

type ResolveAssets = BlockEditorRuntime["assets"]["resolve"];
type ResolveAssetResult = Awaited<ReturnType<ResolveAssets>>;

export interface ClipboardCopySnapshot {
  assetUrls: string[];
  html: string;
  imageAssetUrl: string | null;
  markdown: string;
  nodes: ClipboardSerializedNode[];
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

function createClipboardCopySnapshot(
  nodes: ClipboardSerializedNode[],
  imageAssetUrl: string | null,
): ClipboardCopySnapshot | null {
  const filteredNodes = filterGapCursorNodes(nodes);
  if (filteredNodes.length === 0) {
    return null;
  }

  return {
    assetUrls: collectClipboardAssetUrls(filteredNodes),
    html: exportClipboardNodesToHtml(filteredNodes),
    imageAssetUrl,
    markdown: exportClipboardNodesToMarkdown(filteredNodes),
    nodes: filteredNodes,
  };
}

function serializeClipboardNode(node: LexicalNode): ClipboardSerializedNode {
  const serialized = node.exportJSON() as ClipboardSerializedNode;
  if ($isElementNode(node)) {
    serialized.children = node.getChildren().map(serializeClipboardNode);
  }

  return serialized;
}

export function createClipboardSnapshotFromSelection(
  editor: LexicalEditor,
  selection: BaseSelection,
  options: { includeImageFileUrl: boolean },
): ClipboardCopySnapshot | null {
  if (selection.isCollapsed() || selection.getNodes().length === 0) {
    return null;
  }

  const lexical = $generateJSONFromSelectedNodes<ClipboardSerializedNode>(editor, selection);
  return createClipboardCopySnapshot(
    lexical.nodes,
    getImageAssetUrlForNativeClipboard(lexical.nodes, options.includeImageFileUrl),
  );
}

export function createClipboardSnapshotFromDocument(): ClipboardCopySnapshot | null {
  return createClipboardCopySnapshot($getRoot().getChildren().map(serializeClipboardNode), null);
}

function createAssetUrlMap(result: ResolveAssetResult): Map<string, string> {
  return new Map(result.assets.map((asset) => [asset.assetUrl, asset.fileUrl]));
}

async function resolveClipboardAssetUrls(
  assetUrls: string[],
  resolveAssets: ResolveAssets,
): Promise<Map<string, string>> {
  const resolvedAssets: ResolveAssetResult =
    assetUrls.length > 0
      ? await resolveAssets({ assetUrls }).catch(() => ({ assets: [] }))
      : { assets: [] };
  return createAssetUrlMap(resolvedAssets);
}

async function createClipboardDataFromSnapshot(
  snapshot: ClipboardCopySnapshot,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData> {
  const assetUrlMap = await resolveClipboardAssetUrls(snapshot.assetUrls, resolveAssets);
  const imageFileUrl = snapshot.imageAssetUrl ? assetUrlMap.get(snapshot.imageAssetUrl) : undefined;
  const externalNodes =
    snapshot.assetUrls.length > 0
      ? rewriteClipboardAssetsForExternalFormats(snapshot.nodes, assetUrlMap)
      : snapshot.nodes;

  return {
    html: snapshot.assetUrls.length > 0 ? exportClipboardNodesToHtml(externalNodes) : snapshot.html,
    ...(imageFileUrl ? { imageFileUrl } : {}),
    text: normalizeExternalMarkdown(
      snapshot.assetUrls.length > 0
        ? exportClipboardNodesToMarkdown(externalNodes)
        : snapshot.markdown,
    ),
  };
}

export async function createClipboardDataFromCurrentSelection(
  editor: LexicalEditor,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData | null> {
  const snapshot = withDOM(() =>
    editor.read(() => {
      const selection = $getSelection();
      if (selection === null) {
        return null;
      }

      return createClipboardSnapshotFromSelection(editor, selection, {
        includeImageFileUrl: true,
      });
    }),
  );

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssets) : null;
}

export async function createClipboardDataFromDocument(
  editor: LexicalEditor,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData | null> {
  const snapshot = editor.read(() => createClipboardSnapshotFromDocument());

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssets) : null;
}
