import {
  shortcutActionSchema,
  type ShortcutAction,
  type ShortcutPreferences as StoredShortcutPreferences,
} from "@shared/features/preferences/settings";
import {
  formatForDisplay,
  isModifierKey,
  normalizeHotkey,
  normalizeKeyName,
  parseHotkey,
  validateHotkey,
  type Hotkey,
} from "@tanstack/react-hotkeys";

export type ShortcutUpdateError = "invalid" | "duplicate" | "modifier-required";
export type ShortcutBinding = Hotkey | null;
export type ShortcutPreferences = Record<ShortcutAction, ShortcutBinding>;
export const SHORTCUT_ACTIONS = shortcutActionSchema.options;

type ShortcutPlatform = "mac" | "windows" | "linux";
type KeyboardEventLike = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

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

export function normalizeShortcutPreferences(
  shortcuts: StoredShortcutPreferences,
  platform?: ShortcutPlatform,
): ShortcutPreferences {
  return {
    "toggle-window": shortcuts["toggle-window"]
      ? normalizeShortcutBinding(shortcuts["toggle-window"], platform)
      : null,
    "create-block": shortcuts["create-block"]
      ? normalizeShortcutBinding(shortcuts["create-block"], platform)
      : null,
    "copy-block": shortcuts["copy-block"]
      ? normalizeShortcutBinding(shortcuts["copy-block"], platform)
      : null,
    "keep-block": shortcuts["keep-block"]
      ? normalizeShortcutBinding(shortcuts["keep-block"], platform)
      : null,
    "archive-block": shortcuts["archive-block"]
      ? normalizeShortcutBinding(shortcuts["archive-block"], platform)
      : null,
    "delete-block": shortcuts["delete-block"]
      ? normalizeShortcutBinding(shortcuts["delete-block"], platform)
      : null,
    "quick-create-block": shortcuts["quick-create-block"]
      ? normalizeShortcutBinding(shortcuts["quick-create-block"], platform)
      : null,
    "submit-external-edit": shortcuts["submit-external-edit"]
      ? normalizeShortcutBinding(shortcuts["submit-external-edit"], platform)
      : null,
    "cancel-external-edit": shortcuts["cancel-external-edit"]
      ? normalizeShortcutBinding(shortcuts["cancel-external-edit"], platform)
      : null,
  };
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

export function validateShortcutUpdate(
  action: ShortcutAction,
  candidateShortcut: string,
  shortcuts: ShortcutPreferences,
): ShortcutUpdateError | null {
  const normalizedCandidate = normalizeShortcutBinding(candidateShortcut);

  if (!normalizedCandidate) {
    return "invalid";
  }

  if (!shortcutHasModifier(normalizedCandidate)) {
    return "modifier-required";
  }

  for (const [targetAction, configuredShortcut] of Object.entries(shortcuts) as [
    ShortcutAction,
    ShortcutBinding,
  ][]) {
    if (targetAction === action) {
      continue;
    }

    if (configuredShortcut === normalizedCandidate) {
      return "duplicate";
    }
  }

  return null;
}
