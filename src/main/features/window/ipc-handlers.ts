import type { BrowserWindow } from "electron";

import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";

interface WindowCommandServices {
  getMainWindow: () => BrowserWindow | null;
  requestQuit: () => void;
  toggleMainWindow: () => void;
}

export function createWindowCommandHandlers(
  services: WindowCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "windowHide",
      handle() {
        services.getMainWindow()?.hide();
        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "windowToggle",
      handle() {
        services.toggleMainWindow();
        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "windowDestroy",
      handle() {
        services.requestQuit();
        return undefined;
      },
    }),
  ] as const;
}
