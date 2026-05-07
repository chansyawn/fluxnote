import { fileURLToPath } from "node:url";

import type { IpcRouter } from "@main/core/ipc";
import { encodeBlockEditorClipboardHtml } from "@shared/features/block-editor/clipboard";
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
  ipc.command("clipboard.write", (request) => {
    const image = createClipboardImage(request.imageFileUrl);
    clipboard.write({
      // The Fluxnotes payload is embedded in the HTML so Electron can write text, HTML,
      // optional native image, and the app-specific payload in one clipboard operation.
      // A separate clipboard.writeBuffer() call would overwrite this object on Electron.
      html: encodeBlockEditorClipboardHtml(request.html, request.payload),
      ...(image ? { image } : {}),
      text: request.text,
    });

    return undefined;
  });
}
