import { fileURLToPath } from "node:url";

import type { IpcRouter } from "@main/core/ipc";
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
      html: request.html,
      ...(image ? { image } : {}),
      text: request.text,
    });

    return undefined;
  });
}
