import type { FeatureEventContract, FeatureEventPayload } from "@shared/ipc/feature-api";
import type { BrowserWindow } from "electron";

const shouldLogInvalidEventPayload = process.env.NODE_ENV !== "production" && !process.env.VITEST;

export type EmitIpcEvent = <TContract extends FeatureEventContract>(
  contract: TContract,
  payload: FeatureEventPayload<TContract>,
) => boolean;

interface CreateIpcEventBusOptions {
  getMainWindow: () => BrowserWindow | null;
}

export function createIpcEventBus(options: CreateIpcEventBusOptions): EmitIpcEvent {
  return (contract, payload) => {
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }

    const parsedPayload = contract.payload.safeParse(payload);
    if (!parsedPayload.success) {
      if (shouldLogInvalidEventPayload) {
        console.error(`Invalid IPC event payload for ${contract.key}`, parsedPayload.error.issues);
      }
      return false;
    }

    mainWindow.webContents.send(contract.channel, parsedPayload.data);
    return true;
  };
}
