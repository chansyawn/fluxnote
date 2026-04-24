import type { ShortcutPressedPayload } from "@shared/ipc/contracts";
import { businessError } from "@shared/ipc/errors";
import { globalShortcut } from "electron";

import type { EmitIpcEvent } from "../ipc/emit-ipc-event";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";

interface ShortcutCommandServices {
  emitEvent: EmitIpcEvent;
}

function emitShortcutPressed(emitEvent: EmitIpcEvent, shortcut: string): void {
  emitEvent("shortcutPressed", {
    shortcut,
    state: "Pressed",
  } satisfies ShortcutPressedPayload);
}

export function createShortcutCommandHandlers(
  services: ShortcutCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "shortcutIsRegistered",
      handle(request) {
        return globalShortcut.isRegistered(request.shortcut);
      },
    }),
    defineIpcCommandHandler({
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
    defineIpcCommandHandler({
      key: "shortcutUnregister",
      handle(request) {
        globalShortcut.unregister(request.shortcut);
        return undefined;
      },
    }),
  ] as const;
}
