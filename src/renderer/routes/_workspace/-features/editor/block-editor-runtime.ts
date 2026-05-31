import {
  copyAsset,
  createAsset,
  importAsset,
  openExternalUrl,
  resolveAsset,
  writeBlockEditorClipboard,
} from "@renderer/clients";
import type {
  BlockEditorClipboardWriteData,
  BlockEditorRuntime,
} from "@renderer/features/block-editor";

async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error("Clipboard API is unavailable.");
}

async function writeClipboardWithFallback(data: BlockEditorClipboardWriteData): Promise<void> {
  try {
    await writeBlockEditorClipboard(data);
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
      import: ({ files }) => importAsset({ files, blockId }),
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
