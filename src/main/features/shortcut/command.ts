import type { EventBus } from "@main/core/ipc/event-bus";
import type { IpcRouter } from "@main/core/ipc/register-ipc";
import { businessError } from "@shared/ipc/result";
import { globalShortcut } from "electron";

interface ShortcutCommandDeps {
  events: EventBus;
}

export function registerShortcutCommands(ipc: IpcRouter, deps: ShortcutCommandDeps): void {
  ipc.command("shortcut.is-registered", (input) => {
    return globalShortcut.isRegistered(input.shortcut);
  });

  ipc.command("shortcut.register", (input) => {
    if (globalShortcut.isRegistered(input.shortcut)) {
      globalShortcut.unregister(input.shortcut);
    }

    const ok = globalShortcut.register(input.shortcut, () => {
      deps.events.emit("shortcut.pressed", {
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
