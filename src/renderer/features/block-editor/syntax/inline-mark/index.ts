import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export {
  deleteFromMdast,
  deleteToMdast,
  emphasisFromMdast,
  emphasisToMdast,
  strongFromMdast,
  strongToMdast,
} from "./mdast";

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

export const INLINE_MARK_SYNTAX = {
  id: "inline-mark",
  extension: INLINE_MARK_SYNTAX_EXTENSION,
  markdownShortcuts: [BOLD_STAR, ITALIC_STAR, STRIKETHROUGH, INLINE_CODE],
  mdastTypes: ["emphasis", "strong", "delete", "inlineCode"],
  semanticTypes: ["emphasis", "strong", "delete", "inlineCode"],
} satisfies SyntaxRegistration;
