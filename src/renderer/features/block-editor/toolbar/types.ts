import type { ShortcutBinding } from "@renderer/features/shortcut/shortcut-utils";
import type { ShortcutAction } from "@shared/features/preferences/user-preferences";

export const BLOCK_EDITOR_BLOCK_FORMATS = [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "codeBlock",
] as const;

export const BLOCK_EDITOR_INLINE_FORMATS = [
  "bold",
  "italic",
  "strikethrough",
  "inlineCode",
] as const;

export type BlockEditorBlockFormat = (typeof BLOCK_EDITOR_BLOCK_FORMATS)[number];
export type BlockEditorInlineFormat = (typeof BLOCK_EDITOR_INLINE_FORMATS)[number];
export type BlockEditorShortcutBinding = ShortcutBinding;
export type BlockEditorFormat = BlockEditorBlockFormat | BlockEditorInlineFormat;
export type BlockEditorToolbarShortcuts = Partial<
  Record<BlockEditorFormat, BlockEditorShortcutBinding>
>;

export const BLOCK_EDITOR_FORMAT_SHORTCUT_ACTIONS = {
  blockquote: "editor.blockquote",
  bold: "editor.bold",
  bulletList: "editor.bulletList",
  codeBlock: "editor.codeBlock",
  heading1: "editor.heading1",
  heading2: "editor.heading2",
  heading3: "editor.heading3",
  heading4: "editor.heading4",
  heading5: "editor.heading5",
  heading6: "editor.heading6",
  inlineCode: "editor.inlineCode",
  italic: "editor.italic",
  orderedList: "editor.orderedList",
  paragraph: "editor.paragraph",
  strikethrough: "editor.strikethrough",
  taskList: "editor.taskList",
} satisfies Record<BlockEditorFormat, ShortcutAction>;

export type BlockEditorInlineFormatState = Record<BlockEditorInlineFormat, boolean>;

export interface BlockEditorToolbarState {
  blockFormat: BlockEditorBlockFormat;
  blockFormattingDisabled: boolean;
  inlineFormats: BlockEditorInlineFormatState;
}

export type BlockEditorToolbarStateListener = (state: BlockEditorToolbarState) => void;

export interface BlockEditorToolbarController {
  focus: () => void;
  formatBlock: (format: BlockEditorBlockFormat) => void;
  formatInline: (format: BlockEditorInlineFormat) => void;
  getToolbarState: () => BlockEditorToolbarState;
  subscribeToolbarState: (listener: BlockEditorToolbarStateListener) => () => void;
}

export const DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE: BlockEditorToolbarState = {
  blockFormat: "paragraph",
  blockFormattingDisabled: false,
  inlineFormats: {
    bold: false,
    inlineCode: false,
    italic: false,
    strikethrough: false,
  },
};
