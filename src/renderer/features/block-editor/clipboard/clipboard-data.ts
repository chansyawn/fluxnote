import { withDOM } from "@lexical/headless/dom";
import { $getSelection, type LexicalEditor } from "lexical";

import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "../core/types";
import { normalizeExternalMarkdown } from "../markdown/external-markdown";
import { rewriteClipboardAssetUrls } from "./clipboard-assets";
import {
  exportClipboardSnapshotFromDocument,
  exportClipboardSnapshotFromSelection,
  type ClipboardExportSnapshot,
} from "./clipboard-export";
import { exportClipboardNodesToMarkdown, rewriteClipboardHtmlAssetUrls } from "./clipboard-formats";

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
    assetUrls.length > 0 ? await resolveAssets({ assetUrls }) : { assets: [] };
  return createAssetUrlMap(resolvedAssets);
}

async function createClipboardDataFromSnapshot(
  snapshot: ClipboardExportSnapshot,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData> {
  const assetUrlMap = await resolveClipboardAssetUrls(snapshot.assetUrls, resolveAssets);
  const imageFileUrl = snapshot.imageAssetUrl ? assetUrlMap.get(snapshot.imageAssetUrl) : undefined;
  const externalNodes = rewriteClipboardAssetUrls(snapshot.nodes, assetUrlMap);
  // Keep file:// URLs out of the DOM export path. Chromium attempts to load local
  // resources when an img element receives a file URL, even if the element only
  // exists for clipboard serialization, so rewrite the final HTML string instead.
  const html =
    assetUrlMap.size > 0
      ? rewriteClipboardHtmlAssetUrls(snapshot.html, assetUrlMap)
      : snapshot.html;

  return {
    html,
    ...(imageFileUrl ? { imageFileUrl } : {}),
    nodes: snapshot.nodes,
    text: normalizeExternalMarkdown(
      assetUrlMap.size > 0 ? exportClipboardNodesToMarkdown(externalNodes) : snapshot.markdown,
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
