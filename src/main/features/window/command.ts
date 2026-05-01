import type { IpcRouter } from "@main/core/ipc/register-ipc";

export function registerWindowCommands(ipc: IpcRouter): void {
  ipc.command("window.destroy", (_input, ctx) => {
    ctx.windowManager.requestQuit();
    return undefined;
  });

  ipc.command("window.hide", (_input, ctx) => {
    ctx.windowManager.hideMainWindow();
    return undefined;
  });

  ipc.command("window.toggle", (_input, ctx) => {
    ctx.windowManager.toggleMainWindow();
    return undefined;
  });
}
