import { fileURLToPath } from "node:url";

import type { IpcRouter } from "@main/core/ipc";
import {
  BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL,
  type BlockEditorClipboardData,
} from "@shared/features/block-editor/clipboard";
import { clipboard, nativeImage, type NativeImage } from "electron";

function createClipboardImage(fileUrl: string | undefined): NativeImage | undefined {
  if (!fileUrl) {
    return undefined;
  }

  try {
    const image = nativeImage.createFromPath(fileURLToPath(fileUrl));
    return image.isEmpty() ? undefined : image;
  } catch {
    return undefined;
  }
}

export function registerClipboardCommands(ipc: IpcRouter): void {
  let latestBlockEditorData: BlockEditorClipboardData | null = null;

  ipc.command("clipboard.read", () => {
    if (latestBlockEditorData === null) {
      return { data: null };
    }

    if (clipboard.readText() !== latestBlockEditorData["text/plain"]) {
      latestBlockEditorData = null;
      return { data: null };
    }

    return { data: latestBlockEditorData };
  });

  ipc.command("clipboard.write", (data) => {
    latestBlockEditorData = data;
    const image = createClipboardImage(data[BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]);
    clipboard.write({
      html: data["text/html"],
      ...(image ? { image } : {}),
      text: data["text/plain"],
    });

    return undefined;
  });
}
