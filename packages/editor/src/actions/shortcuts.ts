import type { Hotkey } from "@fluxnotes/shared";
import type { TextFormatType } from "lexical";

import type { BlockEditorListFormat, BlockEditorTextStyleFormat } from "../core/block-format";
import type { BlockEditorInlineFormat } from "./formats";

export type BlockEditorActionExecution =
  | { kind: "inline-format"; format: BlockEditorInlineFormat; lexicalFormat: TextFormatType }
  | { kind: "link" }
  | { kind: "list-format"; format: BlockEditorListFormat }
  | { kind: "quote" }
  | { kind: "text-style"; format: BlockEditorTextStyleFormat };

interface BlockEditorShortcutEntry {
  defaultShortcut: Hotkey;
  execution: BlockEditorActionExecution;
  id: string;
  shortcutResolutionRank: number;
}

export const BLOCK_EDITOR_SHORTCUT_ACTIONS = [
  {
    defaultShortcut: "Mod+Alt+0",
    execution: { kind: "text-style", format: "paragraph" },
    id: "editor.paragraph",
    shortcutResolutionRank: 10,
  },
  {
    defaultShortcut: "Mod+Alt+1",
    execution: { kind: "text-style", format: "heading1" },
    id: "editor.heading1",
    shortcutResolutionRank: 20,
  },
  {
    defaultShortcut: "Mod+Alt+2",
    execution: { kind: "text-style", format: "heading2" },
    id: "editor.heading2",
    shortcutResolutionRank: 30,
  },
  {
    defaultShortcut: "Mod+Alt+3",
    execution: { kind: "text-style", format: "heading3" },
    id: "editor.heading3",
    shortcutResolutionRank: 40,
  },
  {
    defaultShortcut: "Mod+Alt+4",
    execution: { kind: "text-style", format: "heading4" },
    id: "editor.heading4",
    shortcutResolutionRank: 50,
  },
  {
    defaultShortcut: "Mod+Alt+5",
    execution: { kind: "text-style", format: "heading5" },
    id: "editor.heading5",
    shortcutResolutionRank: 60,
  },
  {
    defaultShortcut: "Mod+Alt+6",
    execution: { kind: "text-style", format: "heading6" },
    id: "editor.heading6",
    shortcutResolutionRank: 70,
  },
  {
    defaultShortcut: "Mod+Alt+C",
    execution: { kind: "text-style", format: "codeBlock" },
    id: "editor.codeBlock",
    shortcutResolutionRank: 80,
  },
  {
    defaultShortcut: "Mod+Alt+8",
    execution: { kind: "list-format", format: "bulletList" },
    id: "editor.bulletList",
    shortcutResolutionRank: 90,
  },
  {
    defaultShortcut: "Mod+Alt+7",
    execution: { kind: "list-format", format: "orderedList" },
    id: "editor.orderedList",
    shortcutResolutionRank: 100,
  },
  {
    defaultShortcut: "Mod+Alt+9",
    execution: { kind: "list-format", format: "taskList" },
    id: "editor.taskList",
    shortcutResolutionRank: 110,
  },
  {
    defaultShortcut: "Mod+Alt+B",
    execution: { kind: "quote" },
    id: "editor.blockquote",
    shortcutResolutionRank: 120,
  },
  {
    defaultShortcut: "Mod+B",
    execution: { kind: "inline-format", format: "bold", lexicalFormat: "bold" },
    id: "editor.bold",
    shortcutResolutionRank: 130,
  },
  {
    defaultShortcut: "Mod+I",
    execution: { kind: "inline-format", format: "italic", lexicalFormat: "italic" },
    id: "editor.italic",
    shortcutResolutionRank: 140,
  },
  {
    defaultShortcut: "Mod+Shift+X",
    execution: {
      kind: "inline-format",
      format: "strikethrough",
      lexicalFormat: "strikethrough",
    },
    id: "editor.strikethrough",
    shortcutResolutionRank: 150,
  },
  {
    defaultShortcut: "Mod+Shift+E",
    execution: { kind: "inline-format", format: "inlineCode", lexicalFormat: "code" },
    id: "editor.inlineCode",
    shortcutResolutionRank: 160,
  },
  {
    defaultShortcut: "Mod+Shift+L",
    execution: { kind: "link" },
    id: "editor.link",
    shortcutResolutionRank: 170,
  },
] as const satisfies readonly BlockEditorShortcutEntry[];

export type BlockEditorShortcutAction = (typeof BLOCK_EDITOR_SHORTCUT_ACTIONS)[number];
export type BlockEditorActionId = BlockEditorShortcutAction["id"];

export const BLOCK_EDITOR_SHORTCUT_DEFAULTS = Object.fromEntries(
  BLOCK_EDITOR_SHORTCUT_ACTIONS.map((action) => [action.id, action.defaultShortcut]),
) as Record<BlockEditorActionId, Hotkey>;

export const BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER = BLOCK_EDITOR_SHORTCUT_ACTIONS.toSorted(
  (left, right) => left.shortcutResolutionRank - right.shortcutResolutionRank,
).map((action) => action.id) as BlockEditorActionId[];
