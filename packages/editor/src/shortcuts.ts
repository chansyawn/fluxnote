import { formatForDisplay, parseHotkey, type Hotkey } from "@tanstack/react-hotkeys";

export { BLOCK_EDITOR_SHORTCUT_DEFAULTS, type BlockEditorActionId } from "./shortcut-defaults";

export type ShortcutBinding = Hotkey | null;

type ShortcutPlatform = "mac" | "windows" | "linux";
type KeyboardEventLike = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

function normalizeHotkeyKeyToken(token: string): string {
  const key = token.toLowerCase();
  if (key === "esc" || key === "escape") {
    return "escape";
  }
  if (key === "return") {
    return "enter";
  }
  if (key === "backslash") {
    return "\\";
  }
  return key;
}

function normalizeKeyboardEventKey(key: string): string {
  return normalizeHotkeyKeyToken(key);
}

export function keyboardEventMatchesShortcut(
  event: KeyboardEventLike,
  shortcut: ShortcutBinding,
  platform?: ShortcutPlatform,
): boolean {
  if (!shortcut) {
    return false;
  }

  try {
    const parsed = parseHotkey(shortcut, platform);
    const expectedModifiers = new Set(parsed.modifiers.map((modifier) => modifier.toLowerCase()));
    const actualModifiers = new Set<string>();

    if (event.altKey) {
      actualModifiers.add("alt");
    }
    if (event.ctrlKey) {
      actualModifiers.add("control");
    }
    if (event.metaKey) {
      actualModifiers.add("meta");
    }
    if (event.shiftKey) {
      actualModifiers.add("shift");
    }

    if (expectedModifiers.size !== actualModifiers.size) {
      return false;
    }

    for (const modifier of expectedModifiers) {
      if (!actualModifiers.has(modifier)) {
        return false;
      }
    }

    return normalizeHotkeyKeyToken(parsed.key) === normalizeKeyboardEventKey(event.key);
  } catch {
    return false;
  }
}

export function formatShortcutTokens(
  shortcut: ShortcutBinding,
  platform?: ShortcutPlatform,
): string[] {
  if (!shortcut) {
    return [];
  }

  try {
    return formatForDisplay(shortcut, {
      platform,
      separatorToken: "+",
      useSymbols: false,
    }).split("+");
  } catch {
    return [];
  }
}
