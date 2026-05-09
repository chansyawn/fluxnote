import {
  copyAsset,
  createAsset,
  resolveAsset,
  writeBlockEditorClipboard,
  type BlockEditorClipboardWriteRequest,
} from "@renderer/clients";
import type {
  BlockEditorClipboardWriteData,
  BlockEditorRuntime,
} from "@renderer/features/block-editor";

function createClipboardWriteRequest(
  data: BlockEditorClipboardWriteData,
  blockId: string,
): BlockEditorClipboardWriteRequest {
  return {
    html: data.html,
    ...(data.imageFileUrl ? { imageFileUrl: data.imageFileUrl } : {}),
    payload: {
      nodes: data.nodes,
      sourceBlockId: blockId,
    },
    text: data.text,
  };
}

async function writeClipboardWithFallback(
  data: BlockEditorClipboardWriteData,
  blockId: string,
): Promise<void> {
  const request = createClipboardWriteRequest(data, blockId);

  try {
    await writeBlockEditorClipboard(request);
    return;
  } catch {
    await writeClipboardText(data.text);
  }
}

async function writeClipboardText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error("Clipboard API is unavailable.");
}

export function createBlockEditorRuntime(blockId: string): BlockEditorRuntime {
  return {
    assets: {
      copy: ({ assetUrls, sourceBlockId }) =>
        copyAsset({
          assetUrls,
          sourceBlockId,
          targetBlockId: blockId,
        }),
      create: ({ assets }) =>
        createAsset({
          assets,
          blockId,
        }),
      resolve: resolveAsset,
    },
    clipboard: {
      write: (data) => writeClipboardWithFallback(data, blockId),
      writeText: writeClipboardText,
    },
  };
}
