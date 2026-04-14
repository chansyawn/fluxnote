import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  shortcutActionSchema,
  type ShortcutAction,
  type ShortcutBinding,
  type ShortcutPreferences,
} from "@/app/preferences/preferences-schema";

export type ShortcutUpdateError = "invalid" | "duplicate";
export const SHORTCUT_ACTIONS = shortcutActionSchema.options;

type ShortcutModifier = "Command" | "Control" | "Alt" | "Shift";

const MODIFIER_ORDER: ShortcutModifier[] = ["Command", "Control", "Alt", "Shift"];
const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "Shift"]);

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  Backspace: "Backspace",
  Delete: "Delete",
  Enter: "Enter",
  Escape: "Escape",
  Spacebar: "Space",
  Tab: "Tab",
};

const DISPLAY_LABELS: Record<string, string> = {
  Alt: "Opt",
  Backspace: "Backspace",
  Command: "Cmd",
  Control: "Ctrl",
  Delete: "Delete",
  Down: "Down",
  Enter: "Enter",
  Escape: "Esc",
  Left: "Left",
  Right: "Right",
  Shift: "Shift",
  Space: "Space",
  Tab: "Tab",
  Up: "Up",
};

function normalizeModifierToken(token: string): ShortcutModifier | null {
  const normalizedToken = token.trim().toLowerCase();

  switch (normalizedToken) {
    case "alt":
    case "option":
      return "Alt";
    case "cmd":
    case "command":
    case "meta":
      return "Command";
    case "control":
    case "ctrl":
      return "Control";
    case "shift":
      return "Shift";
    default:
      return null;
  }
}

function normalizeKeyToken(token: string): string | null {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return null;
  }

  const alias = KEY_ALIASES[trimmedToken] ?? KEY_ALIASES[trimmedToken.toUpperCase()];

  if (alias) {
    return alias;
  }

  if (/^[a-z]$/i.test(trimmedToken)) {
    return trimmedToken.toUpperCase();
  }

  if (/^\d$/.test(trimmedToken)) {
    return trimmedToken;
  }

  return DISPLAY_LABELS[trimmedToken] ? trimmedToken : null;
}

function getKeyTokenFromKeyboardEvent(event: KeyboardEvent | ReactKeyboardEvent): string | null {
  if (event.code.startsWith("Key")) {
    return event.code.slice(3).toUpperCase();
  }

  if (event.code.startsWith("Digit")) {
    return event.code.slice(5);
  }

  if (event.code.startsWith("Numpad")) {
    const numpadToken = event.code.slice(6);

    if (/^\d$/.test(numpadToken)) {
      return numpadToken;
    }
  }

  const rawKey = event.key;

  if (MODIFIER_KEYS.has(rawKey)) {
    return null;
  }

  if (rawKey in KEY_ALIASES) {
    return KEY_ALIASES[rawKey];
  }

  if (/^[a-z]$/i.test(rawKey)) {
    return rawKey.toUpperCase();
  }

  if (/^\d$/.test(rawKey)) {
    return rawKey;
  }

  return normalizeKeyToken(rawKey);
}

function getModifierTokensFromKeyboardEvent(
  event: KeyboardEvent | ReactKeyboardEvent,
): ShortcutModifier[] {
  const modifiers: ShortcutModifier[] = [];

  if (event.metaKey) {
    modifiers.push("Command");
  }

  if (event.ctrlKey) {
    modifiers.push("Control");
  }

  if (event.altKey) {
    modifiers.push("Alt");
  }

  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  return modifiers;
}

export function normalizeShortcut(shortcut: string): string | null {
  const segments = shortcut
    .split("+")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const modifiers = new Set<ShortcutModifier>();
  let key: string | null = null;

  for (const segment of segments) {
    const modifier = normalizeModifierToken(segment);

    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    if (key) {
      return null;
    }

    key = normalizeKeyToken(segment);
  }

  if (!key || modifiers.size === 0) {
    return null;
  }

  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join("+");
}

export function getShortcutFromKeyboardEvent(
  event: KeyboardEvent | ReactKeyboardEvent,
): string | null {
  const modifiers = getModifierTokensFromKeyboardEvent(event);

  const keyToken = getKeyTokenFromKeyboardEvent(event);

  if (!keyToken || modifiers.length === 0) {
    return null;
  }

  return [...modifiers, keyToken].join("+");
}

export function getShortcutPreviewTokens(event: KeyboardEvent | ReactKeyboardEvent): string[] {
  const modifiers = getModifierTokensFromKeyboardEvent(event);
  const keyToken = getKeyTokenFromKeyboardEvent(event);
  const tokens = [...modifiers, ...(keyToken ? [keyToken] : [])];

  return tokens.map((segment) => DISPLAY_LABELS[segment] ?? segment);
}

export function matchShortcutEvent(
  event: KeyboardEvent | ReactKeyboardEvent,
  shortcut: ShortcutBinding,
): boolean {
  if (!shortcut) {
    return false;
  }

  const normalizedShortcut = normalizeShortcut(shortcut);
  const eventShortcut = getShortcutFromKeyboardEvent(event);

  return normalizedShortcut !== null && eventShortcut === normalizedShortcut;
}

export function getShortcutDisplayTokens(shortcut: ShortcutBinding): string[] {
  if (!shortcut) {
    return [];
  }

  const normalizedShortcut = normalizeShortcut(shortcut);

  if (!normalizedShortcut) {
    return [];
  }

  return normalizedShortcut.split("+").map((segment) => DISPLAY_LABELS[segment] ?? segment);
}

export function formatShortcutDisplay(shortcut: ShortcutBinding): string {
  return getShortcutDisplayTokens(shortcut).join("+");
}

export function validateShortcutUpdate(
  action: ShortcutAction,
  candidateShortcut: string,
  shortcuts: ShortcutPreferences,
): ShortcutUpdateError | null {
  const normalizedCandidate = normalizeShortcut(candidateShortcut);

  if (!normalizedCandidate) {
    return "invalid";
  }

  for (const [targetAction, configuredShortcut] of Object.entries(shortcuts) as [
    ShortcutAction,
    ShortcutBinding,
  ][]) {
    if (targetAction === action) {
      continue;
    }

    if (configuredShortcut && normalizeShortcut(configuredShortcut) === normalizedCandidate) {
      return "duplicate";
    }
  }

  return null;
}
