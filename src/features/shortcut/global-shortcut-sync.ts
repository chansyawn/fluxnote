import {
  isRegistered,
  register,
  unregister,
  type ShortcutEvent,
} from "@tauri-apps/plugin-global-shortcut";

interface RegisterGlobalShortcutOptions {
  shortcut: string;
  onPressed: () => void;
}

export type RegisterGlobalShortcutResult =
  | { type: "registered" }
  | { type: "recoverable-error"; error: unknown }
  | { type: "unavailable"; error: unknown };

async function isShortcutRegistered(shortcut: string): Promise<boolean> {
  return isRegistered(shortcut).catch(() => false);
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
  const alreadyRegistered = await isShortcutRegistered(shortcut);

  if (alreadyRegistered) {
    await unregister(shortcut).catch(() => {});
  }

  try {
    await register(shortcut, (event) => {
      handleShortcutEvent(event, onPressed);
    });

    return { type: "registered" };
  } catch (error) {
    const stillRegistered = await isShortcutRegistered(shortcut);

    if (stillRegistered) {
      return { type: "recoverable-error", error };
    }

    return { type: "unavailable", error };
  }
}

export async function unregisterGlobalShortcut(shortcut: string): Promise<void> {
  await unregister(shortcut).catch(() => {});
}
