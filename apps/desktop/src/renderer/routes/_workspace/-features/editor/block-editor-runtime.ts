import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "@fluxnotes/editor";
import {
  copyAsset,
  createAsset,
  importFileAssets,
  openExternalUrl,
  resolveAsset,
  writeBlockEditorClipboard,
  type BlockEditorClipboardWriteRequest,
} from "@renderer/clients";

function createClipboardWriteRequest(
  data: BlockEditorClipboardWriteData,
): BlockEditorClipboardWriteRequest {
  return {
    html: data.html,
    ...(data.imageFileUrl ? { imageFileUrl: data.imageFileUrl } : {}),
    text: data.text,
  };
}

async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error("Clipboard API is unavailable.");
}

async function writeClipboardWithFallback(data: BlockEditorClipboardWriteData): Promise<void> {
  try {
    await writeBlockEditorClipboard(createClipboardWriteRequest(data));
  } catch {
    await writeClipboardText(data.text);
  }
}

export function createWorkspaceBlockEditorRuntime(blockId: string): BlockEditorRuntime {
  return {
    assets: {
      copy: ({ assetUrls, sourceBlockId }) =>
        copyAsset({ assetUrls, sourceBlockId, targetBlockId: blockId }),
      create: ({ assets }) => createAsset({ assets, blockId }),
      importFiles: ({ files }) => importFileAssets({ blockId, files }),
      resolve: resolveAsset,
    },
    clipboard: {
      write: writeClipboardWithFallback,
      writeText: writeClipboardText,
    },
    links: {
      openExternal: (url) => openExternalUrl({ url }),
    },
  };
}
