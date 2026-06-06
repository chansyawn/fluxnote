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

import {
  BLOCK_EDITOR_ACTION_METADATA,
  BLOCK_EDITOR_SHORTCUT_DEFAULTS,
  BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER,
  type BlockEditorActionExecution,
  type BlockEditorActionId,
} from "./action-metadata";

interface BlockEditorActionCatalogEntry {
  execution: BlockEditorActionExecution;
  icon: LucideIcon;
  id: BlockEditorActionId;
  label: MessageDescriptor;
}

const blockEditorActionLabels = {
  "editor.paragraph": msg({ id: "block-editor.toolbar.normal-text", message: "Normal text" }),
  "editor.heading1": msg({ id: "block-editor.toolbar.heading-1", message: "Heading 1" }),
  "editor.heading2": msg({ id: "block-editor.toolbar.heading-2", message: "Heading 2" }),
  "editor.heading3": msg({ id: "block-editor.toolbar.heading-3", message: "Heading 3" }),
  "editor.heading4": msg({ id: "block-editor.toolbar.heading-4", message: "Heading 4" }),
  "editor.heading5": msg({ id: "block-editor.toolbar.heading-5", message: "Heading 5" }),
  "editor.heading6": msg({ id: "block-editor.toolbar.heading-6", message: "Heading 6" }),
  "editor.codeBlock": msg({ id: "block-editor.toolbar.code-block", message: "Code block" }),
  "editor.bulletList": msg({ id: "block-editor.toolbar.bullet-list", message: "Bullet list" }),
  "editor.orderedList": msg({
    id: "block-editor.toolbar.numbered-list",
    message: "Numbered list",
  }),
  "editor.taskList": msg({ id: "block-editor.toolbar.task-list", message: "Task list" }),
  "editor.blockquote": msg({ id: "block-editor.toolbar.blockquote", message: "Quote" }),
  "editor.bold": msg({ id: "block-editor.toolbar.bold", message: "Bold" }),
  "editor.italic": msg({ id: "block-editor.toolbar.italic", message: "Italic" }),
  "editor.strikethrough": msg({
    id: "block-editor.toolbar.strikethrough",
    message: "Strikethrough",
  }),
  "editor.inlineCode": msg({ id: "block-editor.toolbar.inline-code", message: "Inline code" }),
  "editor.link": msg({ id: "block-editor.toolbar.link", message: "Link" }),
} as const satisfies Record<BlockEditorActionId, MessageDescriptor>;

const blockEditorActionIcons = {
  "editor.paragraph": PilcrowIcon,
  "editor.heading1": Heading1Icon,
  "editor.heading2": Heading2Icon,
  "editor.heading3": Heading3Icon,
  "editor.heading4": Heading4Icon,
  "editor.heading5": Heading5Icon,
  "editor.heading6": Heading6Icon,
  "editor.codeBlock": BracesIcon,
  "editor.bulletList": ListIcon,
  "editor.orderedList": ListOrderedIcon,
  "editor.taskList": CheckSquareIcon,
  "editor.blockquote": QuoteIcon,
  "editor.bold": BoldIcon,
  "editor.italic": ItalicIcon,
  "editor.strikethrough": StrikethroughIcon,
  "editor.inlineCode": Code2Icon,
  "editor.link": LinkIcon,
} as const satisfies Record<BlockEditorActionId, LucideIcon>;

export const BLOCK_EDITOR_ACTION_CATALOG = BLOCK_EDITOR_ACTION_METADATA.map((action) => ({
  execution: action.execution,
  icon: blockEditorActionIcons[action.id],
  id: action.id,
  label: blockEditorActionLabels[action.id],
})) as readonly BlockEditorActionCatalogEntry[];

export type BlockEditorActionCatalogItem = (typeof BLOCK_EDITOR_ACTION_CATALOG)[number];

export {
  BLOCK_EDITOR_SHORTCUT_DEFAULTS,
  BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER,
  type BlockEditorActionId,
};
