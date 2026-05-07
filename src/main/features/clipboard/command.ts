import type { IpcRouter } from "@main/core/ipc";
import type { BlockEditorClipboardData } from "@shared/features/block-editor/clipboard";
import { clipboard } from "electron";

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
    clipboard.write({
      html: data["text/html"],
      text: data["text/plain"],
    });

    return undefined;
  });
}
