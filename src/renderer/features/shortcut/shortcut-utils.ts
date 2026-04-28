import {
  shortcutActionSchema,
  type ShortcutAction,
  type ShortcutPreferences as StoredShortcutPreferences,
} from "@renderer/app/preferences/preferences-schema";
import {
  formatForDisplay,
  normalizeHotkey,
  parseHotkey,
  validateHotkey,
  type Hotkey,
} from "@tanstack/react-hotkeys";

export type ShortcutUpdateError = "invalid" | "duplicate" | "modifier-required";
export type ShortcutBinding = Hotkey | null;
export type ShortcutPreferences = Record<ShortcutAction, ShortcutBinding>;
export const SHORTCUT_ACTIONS = shortcutActionSchema.options;

type ShortcutPlatform = "mac" | "windows" | "linux";

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
    "delete-block": shortcuts["delete-block"]
      ? normalizeShortcutBinding(shortcuts["delete-block"], platform)
      : null,
  };
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
