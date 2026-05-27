import type { ShortcutBinding } from "@renderer/features/shortcut/shortcut-utils";
import type { ShortcutAction } from "@shared/features/preferences/settings";

export const BLOCK_EDITOR_TEXT_FORMATS = ["bold", "italic", "strikethrough", "code"] as const;

export type BlockEditorTextFormat = (typeof BLOCK_EDITOR_TEXT_FORMATS)[number];
export type BlockEditorShortcutBinding = ShortcutBinding;
export type BlockEditorTextFormatShortcuts = Partial<
  Record<BlockEditorTextFormat, BlockEditorShortcutBinding>
>;

export const BLOCK_EDITOR_TEXT_FORMAT_SHORTCUT_ACTIONS = {
  bold: "formatBold",
  italic: "formatItalic",
  strikethrough: "formatStrikethrough",
  code: "formatInlineCode",
} satisfies Record<BlockEditorTextFormat, ShortcutAction>;

export type BlockEditorTextFormatState = Record<BlockEditorTextFormat, boolean>;

export interface BlockEditorToolbarState {
  textFormats: BlockEditorTextFormatState;
}

export type BlockEditorToolbarStateListener = (state: BlockEditorToolbarState) => void;

export interface BlockEditorToolbarController {
  focus: () => void;
  formatText: (format: BlockEditorTextFormat) => void;
  getToolbarState: () => BlockEditorToolbarState;
  subscribeToolbarState: (listener: BlockEditorToolbarStateListener) => () => void;
}

export const DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE: BlockEditorToolbarState = {
  textFormats: {
    bold: false,
    code: false,
    italic: false,
    strikethrough: false,
  },
};
