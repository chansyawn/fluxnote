import { createFeatureClient } from "@renderer/app/ipc-client";
import { shortcutApi, type ShortcutPressedPayload } from "@shared/features/shortcut";

export interface ShortcutEvent {
  state: ShortcutPressedPayload["state"];
}

const shortcutHandlers = new Map<string, (event: ShortcutEvent) => void>();
let shortcutPressUnlisten: (() => void) | null = null;
const shortcutClient = createFeatureClient(shortcutApi);

function ensureShortcutPressSubscription(): void {
  if (shortcutPressUnlisten) {
    return;
  }

  shortcutPressUnlisten = shortcutClient.events.pressed.subscribe((payload) => {
    const handler = shortcutHandlers.get(payload.shortcut);
    if (!handler) {
      return;
    }

    handler({ state: payload.state });
  });
}

function maybeDisposeShortcutPressSubscription(): void {
  if (shortcutHandlers.size > 0 || !shortcutPressUnlisten) {
    return;
  }

  shortcutPressUnlisten();
  shortcutPressUnlisten = null;
}

export async function isRegistered(shortcut: string): Promise<boolean> {
  return await shortcutClient.commands.isRegistered({ shortcut });
}

export async function register(
  shortcut: string,
  handler: (event: ShortcutEvent) => void,
): Promise<void> {
  await shortcutClient.commands.register({ shortcut });
  shortcutHandlers.set(shortcut, handler);
  ensureShortcutPressSubscription();
}

export async function unregister(shortcut: string): Promise<void> {
  shortcutHandlers.delete(shortcut);
  maybeDisposeShortcutPressSubscription();
  await shortcutClient.commands.unregister({ shortcut });
}
