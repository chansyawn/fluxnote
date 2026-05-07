import { fileURLToPath } from "node:url";

import type { IpcRouter } from "@main/core/ipc";
import {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  blockEditorClipboardPayloadSchema,
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
      html: request.html,
      ...(image ? { image } : {}),
      text: request.text,
    });
    clipboard.writeBuffer(
      BLOCK_EDITOR_CLIPBOARD_MIME,
      Buffer.from(JSON.stringify(request.payload), "utf8"),
    );

    return undefined;
  });
}
