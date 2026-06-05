import {
  formatForDisplay,
  isModifierKey,
  normalizeHotkey,
  normalizeKeyName,
  parseHotkey,
  validateHotkey,
  type Hotkey,
} from "@tanstack/react-hotkeys";

export type { Hotkey };
export type ShortcutBinding = Hotkey | null;
export type ShortcutPlatform = "mac" | "windows" | "linux";
export type KeyboardEventLike = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

function getModifierTokens(event: KeyboardEventLike): string[] {
  const modifiers: string[] = [];

  if (event.ctrlKey) {
    modifiers.push("Control");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }
  if (event.metaKey) {
    modifiers.push("Meta");
  }

  return modifiers;
}

export function normalizeShortcutBinding(
  shortcut: string,
  platform?: ShortcutPlatform,
): Hotkey | null {
  const trimmedShortcut = shortcut.trim();

  if (!trimmedShortcut) {
    return null;
  }

  const validation = validateHotkey(trimmedShortcut);

  if (!validation.valid) {
    return null;
  }

  try {
    return normalizeHotkey(trimmedShortcut, platform);
  } catch {
    return null;
  }
}

export function shortcutHasModifier(
  shortcut: ShortcutBinding,
  platform?: ShortcutPlatform,
): boolean {
  if (!shortcut) {
    return false;
  }

  try {
    return parseHotkey(shortcut, platform).modifiers.length > 0;
  } catch {
    return false;
  }
}

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

  const normalizedShortcut = normalizeShortcutBinding(shortcut, platform);

  if (!normalizedShortcut) {
    return [];
  }

  return formatForDisplay(normalizedShortcut, {
    platform,
    separatorToken: "+",
    useSymbols: false,
  }).split("+");
}

export function formatShortcutRecorderTokens(
  event: KeyboardEventLike,
  platform?: ShortcutPlatform,
): string[] {
  const normalizedKey = normalizeKeyName(event.key);
  const parts = getModifierTokens(event);

  if (!isModifierKey(normalizedKey)) {
    parts.push(normalizedKey);
  }

  if (parts.length === 0) {
    return [];
  }

  return formatForDisplay(parts.join("+"), {
    platform,
    separatorToken: "+",
    useSymbols: false,
  }).split("+");
}

export function normalizeShortcutRecorderHotkey(
  event: KeyboardEventLike,
  platform?: ShortcutPlatform,
): Hotkey | null {
  const normalizedKey = normalizeKeyName(event.key);

  if (isModifierKey(normalizedKey)) {
    return null;
  }

  return normalizeHotkey([...getModifierTokens(event), normalizedKey].join("+"), platform);
}
