import type { EmitIpcEvent } from "@main/core/ipc/emit-ipc-event";
import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import type { ShortcutPressedPayload } from "@shared/ipc/contracts";
import { businessError } from "@shared/ipc/errors";
import { globalShortcut } from "electron";

interface ShortcutCommandServices {
  emitEvent: EmitIpcEvent;
}

function emitShortcutPressed(emitEvent: EmitIpcEvent, shortcut: string): void {
  emitEvent("shortcutPressed", {
    shortcut,
    state: "Pressed",
  } satisfies ShortcutPressedPayload);
}

export function createShortcutIpcCommands(
  services: ShortcutCommandServices,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "shortcutIsRegistered",
      handle(request) {
        return globalShortcut.isRegistered(request.shortcut);
      },
    }),
    defineIpcCommandDefinition({
      key: "shortcutRegister",
      handle(request) {
        if (globalShortcut.isRegistered(request.shortcut)) {
          globalShortcut.unregister(request.shortcut);
        }

        const ok = globalShortcut.register(request.shortcut, () => {
          emitShortcutPressed(services.emitEvent, request.shortcut);
        });

        if (!ok) {
          throw businessError(
            "BUSINESS.INVALID_OPERATION",
            `Failed to register global shortcut: ${request.shortcut}`,
          );
        }

        return undefined;
      },
    }),
    defineIpcCommandDefinition({
      key: "shortcutUnregister",
      handle(request) {
        globalShortcut.unregister(request.shortcut);
        return undefined;
      },
    }),
  ] as const;
}
