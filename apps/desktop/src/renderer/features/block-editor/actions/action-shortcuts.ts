import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";

import type { BlockEditorActionId, BlockEditorShortcutConfig } from "./types";

const LEXICAL_DEFAULT_TEXT_FORMAT_SHORTCUTS = {
  bold: "Mod+B",
  italic: "Mod+I",
  underline: "Mod+U",
} as const;

const SHORTCUT_RESOLUTION_ACTION_ORDER = [
  "editor.paragraph",
  "editor.heading1",
  "editor.heading2",
  "editor.heading3",
  "editor.heading4",
  "editor.heading5",
  "editor.heading6",
  "editor.codeBlock",
  "editor.bulletList",
  "editor.orderedList",
  "editor.taskList",
  "editor.blockquote",
  "editor.bold",
  "editor.italic",
  "editor.strikethrough",
  "editor.inlineCode",
  "editor.link",
] as const satisfies readonly BlockEditorActionId[];

export type BlockEditorShortcutResolution =
  | { action: BlockEditorActionId; type: "configured-action" }
  | { type: "blocked-default" }
  | { type: "none" };

export function resolveBlockEditorShortcut(
  event: KeyboardEvent,
  shortcuts: BlockEditorShortcutConfig,
): BlockEditorShortcutResolution {
  for (const action of SHORTCUT_RESOLUTION_ACTION_ORDER) {
    const shortcut = shortcuts[action] ?? null;

    if (keyboardEventMatchesShortcut(event, shortcut)) {
      return { action, type: "configured-action" };
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
