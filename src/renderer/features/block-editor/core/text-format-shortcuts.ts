import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";

import {
  BLOCK_EDITOR_TEXT_FORMATS,
  type BlockEditorTextFormat,
  type BlockEditorTextFormatShortcuts,
} from "../toolbar/types";

const BROWSER_DEFAULT_TEXT_FORMAT_SHORTCUTS = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
} as const;

export type TextFormatShortcutResolution =
  | { type: "configured"; format: BlockEditorTextFormat }
  | { type: "blocked-default" }
  | { type: "none" };

export function resolveTextFormatShortcut(
  event: KeyboardEvent,
  shortcuts: BlockEditorTextFormatShortcuts,
): TextFormatShortcutResolution {
  for (const format of BLOCK_EDITOR_TEXT_FORMATS) {
    const shortcut = shortcuts[format] ?? null;

    if (keyboardEventMatchesShortcut(event, shortcut)) {
      return { type: "configured", format };
    }
  }

  const isBrowserDefaultShortcut = Object.values(BROWSER_DEFAULT_TEXT_FORMAT_SHORTCUTS).some(
    (shortcut) => keyboardEventMatchesShortcut(event, shortcut),
  );

  if (isBrowserDefaultShortcut) {
    return { type: "blocked-default" };
  }

  return { type: "none" };
}
