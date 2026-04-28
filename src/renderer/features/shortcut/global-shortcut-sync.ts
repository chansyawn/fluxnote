import {
  isRegistered,
  register,
  unregister,
  type ShortcutEvent,
} from "@renderer/clients/global-shortcut";
import { toElectronAccelerator } from "@renderer/features/shortcut/electron-accelerator";
import type { Hotkey } from "@tanstack/react-hotkeys";

interface RegisterGlobalShortcutOptions {
  shortcut: Hotkey;
  onPressed: () => void;
}

export type RegisterGlobalShortcutResult =
  | { type: "registered" }
  | { type: "recoverable-error"; error: unknown }
  | { type: "unavailable"; error: unknown };

async function isShortcutRegistered(accelerator: string): Promise<boolean> {
  return isRegistered(accelerator).catch(() => false);
}

function handleShortcutEvent(event: ShortcutEvent, onPressed: () => void) {
  if (event.state !== "Pressed") {
    return;
  }

  onPressed();
}

export async function registerGlobalShortcut(
  options: RegisterGlobalShortcutOptions,
): Promise<RegisterGlobalShortcutResult> {
  const { onPressed, shortcut } = options;
  const accelerator = toElectronAccelerator(shortcut);

  const alreadyRegistered = await isShortcutRegistered(accelerator);

  if (alreadyRegistered) {
    await unregister(accelerator).catch(() => {});
  }

  try {
    await register(accelerator, (event) => {
      handleShortcutEvent(event, onPressed);
    });

    return { type: "registered" };
  } catch (error) {
    const stillRegistered = await isShortcutRegistered(accelerator);

    if (stillRegistered) {
      return { type: "recoverable-error", error };
    }

    return { type: "unavailable", error };
  }
}

export async function unregisterGlobalShortcut(shortcut: Hotkey): Promise<void> {
  const accelerator = toElectronAccelerator(shortcut);

  await unregister(accelerator).catch(() => {});
}
