import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";

export {
  deleteFromMdast,
  deleteToMdast,
  emphasisFromMdast,
  emphasisToMdast,
  strongFromMdast,
  strongToMdast,
} from "./mdast";

export const INLINE_MARK_MARKDOWN_SHORTCUT_TRANSFORMERS = [
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  INLINE_CODE,
];

export const INLINE_MARK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/inline-mark",
  dependencies: [
    configExtension(MarkdownShortcutExtension, {
      transformers: INLINE_MARK_MARKDOWN_SHORTCUT_TRANSFORMERS,
    }),
  ],
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
  mdastTypes: ["emphasis", "strong", "delete", "inlineCode"],
  semanticTypes: ["emphasis", "strong", "delete", "inlineCode"],
} satisfies SyntaxRegistration;
