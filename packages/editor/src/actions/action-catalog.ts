import type { Hotkey } from "@fluxnotes/shared/shortcuts";
import {
  BoldIcon,
  BracesIcon,
  CheckSquareIcon,
  Code2Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  QuoteIcon,
  StrikethroughIcon,
  type LucideIcon,
} from "@fluxnotes/ui/icons/lucide";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { TextFormatType } from "lexical";

import type { BlockEditorListFormat, BlockEditorTextStyleFormat } from "../core/block-format";
import type { BlockEditorInlineFormat } from "../toolbar/types";

type BlockEditorActionExecution =
  | { kind: "inline-format"; format: BlockEditorInlineFormat; lexicalFormat: TextFormatType }
  | { kind: "link" }
  | { kind: "list-format"; format: BlockEditorListFormat }
  | { kind: "quote" }
  | { kind: "text-style"; format: BlockEditorTextStyleFormat };

interface BlockEditorActionCatalogEntry {
  defaultShortcut: Hotkey;
  execution: BlockEditorActionExecution;
  icon: LucideIcon;
  id: string;
  label: MessageDescriptor;
  shortcutResolutionRank: number;
}

export const BLOCK_EDITOR_ACTION_CATALOG = [
  {
    defaultShortcut: "Mod+Alt+0",
    execution: { kind: "text-style", format: "paragraph" },
    icon: PilcrowIcon,
    id: "editor.paragraph",
    label: msg({ id: "block-editor.toolbar.normal-text", message: "Normal text" }),
    shortcutResolutionRank: 10,
  },
  {
    defaultShortcut: "Mod+Alt+1",
    execution: { kind: "text-style", format: "heading1" },
    icon: Heading1Icon,
    id: "editor.heading1",
    label: msg({ id: "block-editor.toolbar.heading-1", message: "Heading 1" }),
    shortcutResolutionRank: 20,
  },
  {
    defaultShortcut: "Mod+Alt+2",
    execution: { kind: "text-style", format: "heading2" },
    icon: Heading2Icon,
    id: "editor.heading2",
    label: msg({ id: "block-editor.toolbar.heading-2", message: "Heading 2" }),
    shortcutResolutionRank: 30,
  },
  {
    defaultShortcut: "Mod+Alt+3",
    execution: { kind: "text-style", format: "heading3" },
    icon: Heading3Icon,
    id: "editor.heading3",
    label: msg({ id: "block-editor.toolbar.heading-3", message: "Heading 3" }),
    shortcutResolutionRank: 40,
  },
  {
    defaultShortcut: "Mod+Alt+4",
    execution: { kind: "text-style", format: "heading4" },
    icon: Heading4Icon,
    id: "editor.heading4",
    label: msg({ id: "block-editor.toolbar.heading-4", message: "Heading 4" }),
    shortcutResolutionRank: 50,
  },
  {
    defaultShortcut: "Mod+Alt+5",
    execution: { kind: "text-style", format: "heading5" },
    icon: Heading5Icon,
    id: "editor.heading5",
    label: msg({ id: "block-editor.toolbar.heading-5", message: "Heading 5" }),
    shortcutResolutionRank: 60,
  },
  {
    defaultShortcut: "Mod+Alt+6",
    execution: { kind: "text-style", format: "heading6" },
    icon: Heading6Icon,
    id: "editor.heading6",
    label: msg({ id: "block-editor.toolbar.heading-6", message: "Heading 6" }),
    shortcutResolutionRank: 70,
  },
  {
    defaultShortcut: "Mod+Alt+C",
    execution: { kind: "text-style", format: "codeBlock" },
    icon: BracesIcon,
    id: "editor.codeBlock",
    label: msg({ id: "block-editor.toolbar.code-block", message: "Code block" }),
    shortcutResolutionRank: 80,
  },
  {
    defaultShortcut: "Mod+Alt+8",
    execution: { kind: "list-format", format: "bulletList" },
    icon: ListIcon,
    id: "editor.bulletList",
    label: msg({ id: "block-editor.toolbar.bullet-list", message: "Bullet list" }),
    shortcutResolutionRank: 90,
  },
  {
    defaultShortcut: "Mod+Alt+7",
    execution: { kind: "list-format", format: "orderedList" },
    icon: ListOrderedIcon,
    id: "editor.orderedList",
    label: msg({ id: "block-editor.toolbar.numbered-list", message: "Numbered list" }),
    shortcutResolutionRank: 100,
  },
  {
    defaultShortcut: "Mod+Alt+9",
    execution: { kind: "list-format", format: "taskList" },
    icon: CheckSquareIcon,
    id: "editor.taskList",
    label: msg({ id: "block-editor.toolbar.task-list", message: "Task list" }),
    shortcutResolutionRank: 110,
  },
  {
    defaultShortcut: "Mod+Alt+B",
    execution: { kind: "quote" },
    icon: QuoteIcon,
    id: "editor.blockquote",
    label: msg({ id: "block-editor.toolbar.blockquote", message: "Quote" }),
    shortcutResolutionRank: 120,
  },
  {
    defaultShortcut: "Mod+B",
    execution: { kind: "inline-format", format: "bold", lexicalFormat: "bold" },
    icon: BoldIcon,
    id: "editor.bold",
    label: msg({ id: "block-editor.toolbar.bold", message: "Bold" }),
    shortcutResolutionRank: 130,
  },
  {
    defaultShortcut: "Mod+I",
    execution: { kind: "inline-format", format: "italic", lexicalFormat: "italic" },
    icon: ItalicIcon,
    id: "editor.italic",
    label: msg({ id: "block-editor.toolbar.italic", message: "Italic" }),
    shortcutResolutionRank: 140,
  },
  {
    defaultShortcut: "Mod+Shift+X",
    execution: {
      kind: "inline-format",
      format: "strikethrough",
      lexicalFormat: "strikethrough",
    },
    icon: StrikethroughIcon,
    id: "editor.strikethrough",
    label: msg({ id: "block-editor.toolbar.strikethrough", message: "Strikethrough" }),
    shortcutResolutionRank: 150,
  },
  {
    defaultShortcut: "Mod+Shift+E",
    execution: { kind: "inline-format", format: "inlineCode", lexicalFormat: "code" },
    icon: Code2Icon,
    id: "editor.inlineCode",
    label: msg({ id: "block-editor.toolbar.inline-code", message: "Inline code" }),
    shortcutResolutionRank: 160,
  },
  {
    defaultShortcut: "Mod+Shift+L",
    execution: { kind: "link" },
    icon: LinkIcon,
    id: "editor.link",
    label: msg({ id: "block-editor.toolbar.link", message: "Link" }),
    shortcutResolutionRank: 170,
  },
] as const satisfies readonly BlockEditorActionCatalogEntry[];

export type BlockEditorActionCatalogItem = (typeof BLOCK_EDITOR_ACTION_CATALOG)[number];
export type BlockEditorActionId = BlockEditorActionCatalogItem["id"];

export const BLOCK_EDITOR_SHORTCUT_DEFAULTS = Object.fromEntries(
  BLOCK_EDITOR_ACTION_CATALOG.map((action) => [action.id, action.defaultShortcut]),
) as Record<BlockEditorActionId, Hotkey>;

export const BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER = BLOCK_EDITOR_ACTION_CATALOG.toSorted(
  (left, right) => left.shortcutResolutionRank - right.shortcutResolutionRank,
).map((action) => action.id) as BlockEditorActionId[];
