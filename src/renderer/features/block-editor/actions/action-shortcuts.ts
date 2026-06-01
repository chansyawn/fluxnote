import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";

import { BLOCK_EDITOR_ACTION_DEFINITIONS } from "./action-definitions";
import type { BlockEditorActionId, BlockEditorShortcutConfig } from "./types";

const LEXICAL_DEFAULT_TEXT_FORMAT_SHORTCUTS = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
} as const;

export type BlockEditorShortcutResolution =
  | { action: BlockEditorActionId; type: "configured-action" }
  | { type: "blocked-default" }
  | { type: "none" };

export function resolveBlockEditorShortcut(
  event: KeyboardEvent,
  shortcuts: BlockEditorShortcutConfig,
): BlockEditorShortcutResolution {
  for (const action of BLOCK_EDITOR_ACTION_DEFINITIONS) {
    const shortcut = shortcuts[action.id] ?? null;

    if (keyboardEventMatchesShortcut(event, shortcut)) {
      return { action: action.id, type: "configured-action" };
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
