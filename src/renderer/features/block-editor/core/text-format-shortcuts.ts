import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";

import {
  BLOCK_EDITOR_BLOCK_FORMATS,
  BLOCK_EDITOR_INLINE_FORMATS,
  type BlockEditorBlockFormat,
  type BlockEditorInlineFormat,
  type BlockEditorToolbarShortcuts,
} from "../toolbar/types";

const LEXICAL_DEFAULT_TEXT_FORMAT_SHORTCUTS = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
} as const;

export type TextFormatShortcutResolution =
  | { type: "configured-block"; format: BlockEditorBlockFormat }
  | { type: "configured-inline"; format: BlockEditorInlineFormat }
  | { type: "blocked-default" }
  | { type: "none" };

export function resolveTextFormatShortcut(
  event: KeyboardEvent,
  shortcuts: BlockEditorToolbarShortcuts,
): TextFormatShortcutResolution {
  for (const format of BLOCK_EDITOR_BLOCK_FORMATS) {
    const shortcut = shortcuts[format] ?? null;

    if (keyboardEventMatchesShortcut(event, shortcut)) {
      return { type: "configured-block", format };
    }
  }

  for (const format of BLOCK_EDITOR_INLINE_FORMATS) {
    const shortcut = shortcuts[format] ?? null;

    if (keyboardEventMatchesShortcut(event, shortcut)) {
      return { type: "configured-inline", format };
    }
  }

  const isLexicalDefaultShortcut = Object.values(LEXICAL_DEFAULT_TEXT_FORMAT_SHORTCUTS).some(
    (shortcut) => keyboardEventMatchesShortcut(event, shortcut),
  );

  if (isLexicalDefaultShortcut) {
    return { type: "blocked-default" };
  }

  return { type: "none" };
}
