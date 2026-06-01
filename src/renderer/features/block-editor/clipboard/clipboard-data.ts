import { withDOM } from "@lexical/headless/dom";
import { $getSelection, type LexicalEditor } from "lexical";

import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "../core/types";
import { normalizeExternalMarkdown } from "../markdown/external-markdown";
import { rewriteClipboardAssetsForExternalFormats } from "./clipboard-assets";
import {
  exportClipboardSnapshotFromDocument,
  exportClipboardSnapshotFromSelection,
  type ClipboardExportSnapshot,
} from "./clipboard-export";
import { exportClipboardNodesToHtml, exportClipboardNodesToMarkdown } from "./clipboard-formats";

type ResolveAssets = BlockEditorRuntime["assets"]["resolve"];
type ResolveAssetResult = Awaited<ReturnType<ResolveAssets>>;

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
  snapshot: ClipboardExportSnapshot,
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

      return exportClipboardSnapshotFromSelection(editor, selection, {
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
  const snapshot = editor.read(() => exportClipboardSnapshotFromDocument());

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssets) : null;
}
