import {
  detectPlatform,
  formatForDisplay,
  isModifierKey,
  normalizeHotkey,
  normalizeKeyName,
  PUNCTUATION_CODE_MAP,
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
> & { code?: string };

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

function resolveKeyFromCode(code: string): string | null {
  if (code.startsWith("Key")) {
    const letter = code.slice(3);

    return /^[A-Z]$/.test(letter) ? letter : null;
  }

  if (code.startsWith("Digit")) {
    const digit = code.slice(5);

    return /^[0-9]$/.test(digit) ? digit : null;
  }

  return PUNCTUATION_CODE_MAP[code] ?? null;
}

function shouldUseCodeKeyFallback({
  codeKey,
  event,
  normalizedKey,
  platform,
}: {
  codeKey: string | null;
  event: KeyboardEventLike;
  normalizedKey: string;
  platform: ShortcutPlatform;
}): boolean {
  if (!codeKey) {
    return false;
  }

  if (normalizedKey === "Dead") {
    return true;
  }

  if (platform !== "mac" || !event.altKey || normalizedKey.length !== 1) {
    return false;
  }

  return !/^[A-Za-z0-9]$/.test(normalizedKey);
}

function resolveKeyboardEventKey(event: KeyboardEventLike, platform: ShortcutPlatform): string {
  const codeKey = event.code ? resolveKeyFromCode(event.code) : null;
  const normalizedKey = normalizeKeyName(event.key);

  return codeKey && shouldUseCodeKeyFallback({ codeKey, event, normalizedKey, platform })
    ? normalizeKeyName(codeKey)
    : normalizedKey;
}

function getKeyboardEventHotkeyParts(
  event: KeyboardEventLike,
  platform: ShortcutPlatform,
): string[] {
  const normalizedKey = resolveKeyboardEventKey(event, platform);
  const parts = getModifierTokens(event);

  if (!isModifierKey(normalizedKey)) {
    parts.push(normalizedKey);
  }

  return parts;
}

function normalizeKeyboardEventHotkey(
  event: KeyboardEventLike,
  platform?: ShortcutPlatform,
): Hotkey | null {
  const resolvedPlatform = platform ?? detectPlatform();
  const normalizedKey = resolveKeyboardEventKey(event, resolvedPlatform);

  if (isModifierKey(normalizedKey)) {
    return null;
  }

  return normalizeHotkey([...getModifierTokens(event), normalizedKey].join("+"), resolvedPlatform);
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

export function keyboardEventMatchesShortcut(
  event: KeyboardEventLike,
  shortcut: ShortcutBinding,
  platform?: ShortcutPlatform,
): boolean {
  if (!shortcut) {
    return false;
  }

  try {
    const eventHotkey = normalizeKeyboardEventHotkey(event, platform);
    const configuredHotkey = normalizeShortcutBinding(shortcut, platform);

    return Boolean(eventHotkey && configuredHotkey && eventHotkey === configuredHotkey);
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
  const resolvedPlatform = platform ?? detectPlatform();
  const parts = getKeyboardEventHotkeyParts(event, resolvedPlatform);

  if (parts.length === 0) {
    return [];
  }

  return formatForDisplay(parts.join("+"), {
    platform: resolvedPlatform,
    separatorToken: "+",
    useSymbols: false,
  }).split("+");
}

export function normalizeShortcutRecorderHotkey(
  event: KeyboardEventLike,
  platform?: ShortcutPlatform,
): Hotkey | null {
  return normalizeKeyboardEventHotkey(event, platform);
}
