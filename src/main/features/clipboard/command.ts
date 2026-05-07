import { fileURLToPath } from "node:url";

import type { IpcRouter } from "@main/core/ipc";
import {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  blockEditorClipboardPayloadSchema,
  decodeBlockEditorClipboardHtml,
  encodeBlockEditorClipboardHtml,
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
  ipc.command("clipboard.read", () => {
    const payload = decodeBlockEditorClipboardHtml(clipboard.readHTML());
    if (payload) {
      return { payload };
    }

    // Backward compatibility for clipboard entries written before Fluxnotes moved the
    // internal payload into HTML metadata. New writes avoid writeBuffer() because Electron
    // treats clipboard writes as whole-clipboard replacements, so writeBuffer() would
    // erase the standard text/html/image formats written by clipboard.write().
    const buffer = clipboard.readBuffer(BLOCK_EDITOR_CLIPBOARD_MIME);
    if (buffer.length === 0) {
      return { payload: null };
    }

    try {
      const parsed = JSON.parse(buffer.toString("utf8")) as unknown;
      return { payload: blockEditorClipboardPayloadSchema.parse(parsed) };
    } catch {
      return { payload: null };
    }
  });

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
