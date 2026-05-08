import { copyAsset, type CopyAssetResult } from "@renderer/clients";
import {
  collectImageAssetUrls,
  rewriteClipboardImageAssetUrls,
} from "@shared/features/block-editor/asset-urls";
import type {
  BlockEditorClipboardPayload,
  ClipboardSerializedNode,
} from "@shared/features/block-editor/clipboard";

type CopyAssetClient = typeof copyAsset;

function createAssetUrlMap(result: CopyAssetResult): Map<string, string> {
  return new Map(result.assets.map((asset) => [asset.sourceAssetUrl, asset.assetUrl]));
}

export const collectClipboardAssetUrls = collectImageAssetUrls;
export const rewriteClipboardAssetUrls = rewriteClipboardImageAssetUrls;

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
