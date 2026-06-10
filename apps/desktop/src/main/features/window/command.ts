import type { IpcRouter } from "@main/core/ipc";

import type { WindowManager } from "./manager";

interface WindowCommandDeps {
  windowManager: WindowManager;
}

export function registerWindowCommands(ipc: IpcRouter, deps: WindowCommandDeps): void {
  ipc.command("window.destroy", () => {
    deps.windowManager.requestQuit();
    return undefined;
  });

  ipc.command("window.hide", () => {
    deps.windowManager.hideMainWindow();
    return undefined;
  });

  ipc.command("window.restart", () => {
    deps.windowManager.restartApp();
    return undefined;
  });

  ipc.command("window.toggle", () => {
    deps.windowManager.toggleMainWindow();
    return undefined;
  });
}
