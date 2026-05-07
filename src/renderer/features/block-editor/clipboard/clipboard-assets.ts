import { copyAsset, type CopyAssetResult } from "@renderer/clients";

import type { BlockEditorClipboardPayload, ClipboardSerializedNode } from "./clipboard-codec";

type CopyAssetClient = typeof copyAsset;

function createAssetUrlMap(result: CopyAssetResult): Map<string, string> {
  return new Map(result.assets.map((asset) => [asset.sourceAssetUrl, asset.assetUrl]));
}

export function rewriteClipboardAssetUrls(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
  assetUrlMap: Map<string, string>,
): ClipboardSerializedNode[] {
  return nodes.map((node) => {
    const nextNode: ClipboardSerializedNode = { ...node };
    if (node.type === "image" && typeof node.src === "string") {
      nextNode.src = assetUrlMap.get(node.src) ?? node.src;
    }

    if (node.children) {
      nextNode.children = rewriteClipboardAssetUrls(node.children, assetUrlMap);
    }

    return nextNode;
  });
}

export function collectClipboardAssetUrls(nodes: ReadonlyArray<ClipboardSerializedNode>): string[] {
  const assetUrls = new Set<string>();

  const visit = (node: ClipboardSerializedNode) => {
    if (node.type === "image" && typeof node.src === "string" && node.src.startsWith("assets://")) {
      assetUrls.add(node.src);
    }

    node.children?.forEach(visit);
  };

  nodes.forEach(visit);
  return Array.from(assetUrls);
}

export async function createNodesForTargetBlock(
  payload: BlockEditorClipboardPayload,
  targetBlockId: string,
  copyAssetClient: CopyAssetClient = copyAsset,
): Promise<ClipboardSerializedNode[]> {
  const sourceAssetUrls = collectClipboardAssetUrls(payload.nodes);
  if (sourceAssetUrls.length === 0) {
    return [...payload.nodes];
  }

  const copiedAssets = await copyAssetClient({
    assetUrls: sourceAssetUrls,
    sourceBlockId: payload.sourceBlockId,
    targetBlockId,
  });
  return rewriteClipboardAssetUrls(payload.nodes, createAssetUrlMap(copiedAssets));
}
