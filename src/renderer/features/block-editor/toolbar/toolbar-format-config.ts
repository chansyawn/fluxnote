import type { I18n } from "@lingui/core";
import type { ShortcutAction } from "@shared/features/preferences/user-preferences";
import {
  BoldIcon,
  BracesIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  Code2Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  QuoteIcon,
  StrikethroughIcon,
  type LucideIcon,
} from "lucide-react";

import type { BlockEditorBlockFormat, BlockEditorFormat, BlockEditorInlineFormat } from "./types";

export interface ToolbarFormatDefinition<TFormat extends BlockEditorFormat = BlockEditorFormat> {
  action: ShortcutAction;
  format: TFormat;
  icon: LucideIcon;
  label: string;
}

export const TEXT_STYLE_FORMATS = [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
] as const satisfies readonly BlockEditorBlockFormat[];

export const LIST_FORMATS = [
  "bulletList",
  "orderedList",
  "taskList",
] as const satisfies readonly BlockEditorBlockFormat[];

export const BLOCK_BUTTON_FORMATS = [
  "blockquote",
  "codeBlock",
] as const satisfies readonly BlockEditorBlockFormat[];

export const INLINE_FORMATS = [
  "bold",
  "italic",
  "strikethrough",
  "inlineCode",
] as const satisfies readonly BlockEditorInlineFormat[];

export const TOOLBAR_FORMAT_ICONS = {
  blockquote: QuoteIcon,
  bold: BoldIcon,
  bulletList: ListIcon,
  codeBlock: BracesIcon,
  heading1: Heading1Icon,
  heading2: Heading2Icon,
  heading3: Heading3Icon,
  heading4: Heading4Icon,
  heading5: Heading5Icon,
  heading6: Heading6Icon,
  inlineCode: Code2Icon,
  italic: ItalicIcon,
  orderedList: ListOrderedIcon,
  paragraph: PilcrowIcon,
  strikethrough: StrikethroughIcon,
  taskList: CheckSquareIcon,
} satisfies Record<BlockEditorFormat, LucideIcon>;

export { ChevronDownIcon };

export function createToolbarFormatDefinitions(i18n: I18n) {
  return {
    blockquote: {
      action: "editor.blockquote",
      format: "blockquote",
      icon: TOOLBAR_FORMAT_ICONS.blockquote,
      label: i18n._({ id: "block-editor.toolbar.blockquote", message: "Quote" }),
    },
    bold: {
      action: "editor.bold",
      format: "bold",
      icon: TOOLBAR_FORMAT_ICONS.bold,
      label: i18n._({ id: "block-editor.toolbar.bold", message: "Bold" }),
    },
    bulletList: {
      action: "editor.bulletList",
      format: "bulletList",
      icon: TOOLBAR_FORMAT_ICONS.bulletList,
      label: i18n._({ id: "block-editor.toolbar.bullet-list", message: "Bullet list" }),
    },
    codeBlock: {
      action: "editor.codeBlock",
      format: "codeBlock",
      icon: TOOLBAR_FORMAT_ICONS.codeBlock,
      label: i18n._({ id: "block-editor.toolbar.code-block", message: "Code block" }),
    },
    heading1: {
      action: "editor.heading1",
      format: "heading1",
      icon: TOOLBAR_FORMAT_ICONS.heading1,
      label: i18n._({ id: "block-editor.toolbar.heading-1", message: "Heading 1" }),
    },
    heading2: {
      action: "editor.heading2",
      format: "heading2",
      icon: TOOLBAR_FORMAT_ICONS.heading2,
      label: i18n._({ id: "block-editor.toolbar.heading-2", message: "Heading 2" }),
    },
    heading3: {
      action: "editor.heading3",
      format: "heading3",
      icon: TOOLBAR_FORMAT_ICONS.heading3,
      label: i18n._({ id: "block-editor.toolbar.heading-3", message: "Heading 3" }),
    },
    heading4: {
      action: "editor.heading4",
      format: "heading4",
      icon: TOOLBAR_FORMAT_ICONS.heading4,
      label: i18n._({ id: "block-editor.toolbar.heading-4", message: "Heading 4" }),
    },
    heading5: {
      action: "editor.heading5",
      format: "heading5",
      icon: TOOLBAR_FORMAT_ICONS.heading5,
      label: i18n._({ id: "block-editor.toolbar.heading-5", message: "Heading 5" }),
    },
    heading6: {
      action: "editor.heading6",
      format: "heading6",
      icon: TOOLBAR_FORMAT_ICONS.heading6,
      label: i18n._({ id: "block-editor.toolbar.heading-6", message: "Heading 6" }),
    },
    inlineCode: {
      action: "editor.inlineCode",
      format: "inlineCode",
      icon: TOOLBAR_FORMAT_ICONS.inlineCode,
      label: i18n._({ id: "block-editor.toolbar.inline-code", message: "Inline code" }),
    },
    italic: {
      action: "editor.italic",
      format: "italic",
      icon: TOOLBAR_FORMAT_ICONS.italic,
      label: i18n._({ id: "block-editor.toolbar.italic", message: "Italic" }),
    },
    orderedList: {
      action: "editor.orderedList",
      format: "orderedList",
      icon: TOOLBAR_FORMAT_ICONS.orderedList,
      label: i18n._({ id: "block-editor.toolbar.numbered-list", message: "Numbered list" }),
    },
    paragraph: {
      action: "editor.paragraph",
      format: "paragraph",
      icon: TOOLBAR_FORMAT_ICONS.paragraph,
      label: i18n._({ id: "block-editor.toolbar.normal-text", message: "Normal text" }),
    },
    strikethrough: {
      action: "editor.strikethrough",
      format: "strikethrough",
      icon: TOOLBAR_FORMAT_ICONS.strikethrough,
      label: i18n._({ id: "block-editor.toolbar.strikethrough", message: "Strikethrough" }),
    },
    taskList: {
      action: "editor.taskList",
      format: "taskList",
      icon: TOOLBAR_FORMAT_ICONS.taskList,
      label: i18n._({ id: "block-editor.toolbar.task-list", message: "Task list" }),
    },
  } satisfies Record<BlockEditorFormat, ToolbarFormatDefinition>;
}
