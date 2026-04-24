import { ipcEventContracts, type IpcEventKey, type IpcEventPayload } from "@shared/ipc/contracts";
import type { BrowserWindow } from "electron";

const shouldLogInvalidEventPayload = process.env.NODE_ENV !== "production";

export type EmitIpcEvent = <TKey extends IpcEventKey>(
  key: TKey,
  payload: IpcEventPayload<TKey>,
) => boolean;

interface CreateEmitIpcEventOptions {
  getMainWindow: () => BrowserWindow | null;
}

export function createEmitIpcEvent(options: CreateEmitIpcEventOptions): EmitIpcEvent {
  return (key, payload) => {
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }

    const contract = ipcEventContracts[key];
    const parsedPayload = contract.payload.safeParse(payload);
    if (!parsedPayload.success) {
      if (shouldLogInvalidEventPayload) {
        console.error(`Invalid IPC event payload for ${key}`, parsedPayload.error);
      }
      return false;
    }

    mainWindow.webContents.send(contract.channel, parsedPayload.data);
    return true;
  };
}
