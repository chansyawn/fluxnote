export const BLOCK_EDITOR_TEXT_FORMATS = ["bold", "code", "strikethrough", "italic"] as const;

export type BlockEditorTextFormat = (typeof BLOCK_EDITOR_TEXT_FORMATS)[number];

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
