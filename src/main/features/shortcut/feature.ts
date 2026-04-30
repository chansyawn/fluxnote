import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import type { EmitIpcEvent } from "@main/core/ipc/event-bus";
import { shortcutApi, type ShortcutPressedPayload } from "@shared/features/shortcut";
import { businessError } from "@shared/ipc/errors";
import { globalShortcut } from "electron";

interface ShortcutServices {
  emitEvent: EmitIpcEvent;
}

function emitShortcutPressed(emitEvent: EmitIpcEvent, shortcut: string): void {
  emitEvent(shortcutApi.events.pressed, {
    shortcut,
    state: "Pressed",
  } satisfies ShortcutPressedPayload);
}

export function createShortcutFeature(services: ShortcutServices) {
  return defineBackendFeature(shortcutApi, {
    commands: {
      isRegistered(request) {
        return globalShortcut.isRegistered(request.shortcut);
      },
      register(request) {
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
      unregister(request) {
        globalShortcut.unregister(request.shortcut);
        return undefined;
      },
    },
  });
}
