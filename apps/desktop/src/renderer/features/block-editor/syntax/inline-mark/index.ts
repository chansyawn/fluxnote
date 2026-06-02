import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";

export const INLINE_MARK_MARKDOWN_SHORTCUT_TRANSFORMERS = [
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  INLINE_CODE,
];

export const INLINE_MARK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/inline-mark",
  theme: {
    text: {
      bold: "block-editor__text--strong",
      code: "block-editor__inline-code",
      italic: "block-editor__text--emphasis",
      strikethrough: "block-editor__text--strikethrough",
    },
  },
});
