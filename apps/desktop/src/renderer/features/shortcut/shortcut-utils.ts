import {
  formatShortcutRecorderTokens,
  formatShortcutTokens,
  keyboardEventMatchesShortcut,
  normalizeShortcutBinding,
  normalizeShortcutRecorderHotkey,
  shortcutHasModifier,
  type ShortcutBinding,
  type ShortcutPlatform,
} from "@fluxnotes/shared";
import {
  shortcutActionSchema,
  type ShortcutAction,
  type ShortcutPreferences as StoredShortcutPreferences,
} from "@shared/features/preferences/user-preferences";

export type ShortcutUpdateError = "invalid" | "duplicate" | "modifier-required";
export type ShortcutPreferences = Record<ShortcutAction, ShortcutBinding>;
export const SHORTCUT_ACTIONS = shortcutActionSchema.options;

export {
  formatShortcutRecorderTokens,
  formatShortcutTokens,
  keyboardEventMatchesShortcut,
  normalizeShortcutBinding,
  normalizeShortcutRecorderHotkey,
};
export type { ShortcutBinding, ShortcutPlatform };

export function normalizeShortcutPreferences(
  shortcuts: StoredShortcutPreferences,
  platform?: ShortcutPlatform,
): ShortcutPreferences {
  const normalizedShortcuts = {} as ShortcutPreferences;

  for (const action of SHORTCUT_ACTIONS) {
    normalizedShortcuts[action] = shortcuts[action]
      ? normalizeShortcutBinding(shortcuts[action], platform)
      : null;
  }

  return normalizedShortcuts;
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
