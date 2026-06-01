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
export type BlockEditorFormat = BlockEditorBlockFormat | BlockEditorInlineFormat;

export type BlockEditorInlineFormatState = Record<BlockEditorInlineFormat, boolean>;
