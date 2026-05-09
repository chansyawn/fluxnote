import {
  collectImageAssetUrls,
  rewriteClipboardImageAssetUrls,
} from "@shared/features/block-editor/asset-urls";
import type {
  BlockEditorClipboardPayload,
  ClipboardSerializedNode,
} from "@shared/features/block-editor/clipboard";

import type { BlockEditorRuntime } from "../core/types";

type CopyAssets = BlockEditorRuntime["assets"]["copy"];
type CopyAssetResult = Awaited<ReturnType<CopyAssets>>;

function createAssetUrlMap(result: CopyAssetResult): Map<string, string> {
  return new Map(result.assets.map((asset) => [asset.sourceAssetUrl, asset.assetUrl]));
}

export const collectClipboardAssetUrls = collectImageAssetUrls;
export const rewriteClipboardAssetUrls = rewriteClipboardImageAssetUrls;

export async function createNodesForTargetBlock(
  payload: BlockEditorClipboardPayload,
  copyAssets: CopyAssets,
): Promise<ClipboardSerializedNode[]> {
  const sourceAssetUrls = collectClipboardAssetUrls(payload.nodes);
  if (sourceAssetUrls.length === 0) {
    return [...payload.nodes];
  }

  const copiedAssets = await copyAssets({
    assetUrls: sourceAssetUrls,
    sourceBlockId: payload.sourceBlockId,
  });
  return rewriteClipboardAssetUrls(payload.nodes, createAssetUrlMap(copiedAssets));
}
