import type { IpcRouter } from "@main/core/ipc/register-ipc";
import { businessError } from "@shared/ipc/result";
import { globalShortcut } from "electron";

export function registerShortcutCommands(ipc: IpcRouter): void {
  ipc.command("shortcut.isRegistered", (input) => {
    return globalShortcut.isRegistered(input.shortcut);
  });

  ipc.command("shortcut.register", (input, ctx) => {
    if (globalShortcut.isRegistered(input.shortcut)) {
      globalShortcut.unregister(input.shortcut);
    }

    const ok = globalShortcut.register(input.shortcut, () => {
      ctx.events.emit("shortcut.pressed", {
        shortcut: input.shortcut,
        state: "Pressed",
      });
    });

    if (!ok) {
      throw businessError(
        "BUSINESS.INVALID_OPERATION",
        `Failed to register global shortcut: ${input.shortcut}`,
      );
    }

    return undefined;
  });

  ipc.command("shortcut.unregister", (input) => {
    globalShortcut.unregister(input.shortcut);
    return undefined;
  });
}
