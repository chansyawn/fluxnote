import type { ShortcutBinding } from "@renderer/features/shortcut/shortcut-utils";
import type { ShortcutAction } from "@shared/features/preferences/user-preferences";

export const BLOCK_EDITOR_INLINE_FORMATS = [
  "bold",
  "italic",
  "strikethrough",
  "inlineCode",
  "link",
] as const;
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

export type BlockEditorInlineFormat = (typeof BLOCK_EDITOR_INLINE_FORMATS)[number];
export type BlockEditorBlockFormat = (typeof BLOCK_EDITOR_BLOCK_FORMATS)[number];
export type BlockEditorToolbarFormat = BlockEditorInlineFormat | BlockEditorBlockFormat;
export type BlockEditorShortcutBinding = ShortcutBinding;

export const BLOCK_EDITOR_FORMAT_SHORTCUT_ACTIONS = {
  paragraph: "editor.paragraph",
  heading1: "editor.heading1",
  heading2: "editor.heading2",
  heading3: "editor.heading3",
  heading4: "editor.heading4",
  heading5: "editor.heading5",
  heading6: "editor.heading6",
  blockquote: "editor.blockquote",
  bulletList: "editor.bulletList",
  orderedList: "editor.orderedList",
  taskList: "editor.taskList",
  codeBlock: "editor.codeBlock",
  bold: "editor.bold",
  italic: "editor.italic",
  strikethrough: "editor.strikethrough",
  inlineCode: "editor.inlineCode",
  link: "editor.link",
} satisfies Record<BlockEditorToolbarFormat, ShortcutAction>;

export type BlockEditorInlineFormatState = Record<BlockEditorInlineFormat, boolean>;
export type BlockEditorBlockFormatState = Record<BlockEditorBlockFormat, boolean>;

export type BlockEditorToolbarCommand =
  | {
      type: "set-block";
      format: BlockEditorBlockFormat;
    }
  | {
      type: "toggle-inline";
      format: BlockEditorInlineFormat;
    };

export interface BlockEditorToolbarState {
  activeBlocks: BlockEditorBlockFormatState;
  blockFormat: BlockEditorBlockFormat;
  inlineFormats: BlockEditorInlineFormatState;
}

export type BlockEditorToolbarStateListener = (state: BlockEditorToolbarState) => void;

export interface BlockEditorToolbarController {
  focus: () => void;
  getToolbarState: () => BlockEditorToolbarState;
  runToolbarCommand: (command: BlockEditorToolbarCommand) => void;
  subscribeToolbarState: (listener: BlockEditorToolbarStateListener) => () => void;
}

export const DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE: BlockEditorToolbarState = {
  activeBlocks: {
    blockquote: false,
    bulletList: false,
    codeBlock: false,
    heading1: false,
    heading2: false,
    heading3: false,
    heading4: false,
    heading5: false,
    heading6: false,
    orderedList: false,
    paragraph: true,
    taskList: false,
  },
  blockFormat: "paragraph",
  inlineFormats: {
    bold: false,
    inlineCode: false,
    italic: false,
    link: false,
    strikethrough: false,
  },
};
