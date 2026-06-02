import { contracts, type EventName, type EventPayload } from "@shared/ipc/types";
import type { BrowserWindow, WebContents } from "electron";

const shouldLogInvalidEventPayload = process.env.NODE_ENV !== "production" && !process.env.VITEST;

export interface EventBus {
  registerWindow: (win: BrowserWindow) => void;
  emit: <T extends EventName>(name: T, payload: EventPayload<T>) => boolean;
  isSenderTrusted: (sender: WebContents) => boolean;
}

export function createEventBus(): EventBus {
  const windows = new Set<BrowserWindow>();

  function registerWindow(win: BrowserWindow): void {
    windows.add(win);
    win.on("closed", () => {
      windows.delete(win);
    });
  }

  function isSenderTrusted(sender: WebContents): boolean {
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents === sender) {
        return true;
      }
    }

    return false;
  }

  function emit<T extends EventName>(name: T, payload: EventPayload<T>): boolean {
    const schema = contracts.events[name];
    const parsedPayload = schema.safeParse(payload);
    if (!parsedPayload.success) {
      if (shouldLogInvalidEventPayload) {
        console.error(`Invalid IPC event payload for ${name}`, parsedPayload.error.issues);
      }
      return false;
    }

    let sent = false;
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(name, parsedPayload.data);
        sent = true;
      }
    }

    return sent;
  }

  return {
    registerWindow,
    emit,
    isSenderTrusted,
  };
}
