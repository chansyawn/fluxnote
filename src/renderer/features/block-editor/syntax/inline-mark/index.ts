import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import {
  deleteFromMdast,
  deleteToMdast,
  emphasisFromMdast,
  emphasisToMdast,
  strongFromMdast,
  strongToMdast,
} from "./mdast";

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
  extensions: [INLINE_MARK_SYNTAX_EXTENSION],
  markdownShortcuts: INLINE_MARK_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromInline: (node, context) => {
      switch (node.type) {
        case "emphasis":
          return [emphasisFromMdast(node, context.readInlines)];
        case "strong":
          return [strongFromMdast(node, context.readInlines)];
        case "delete":
          return [deleteFromMdast(node, context.readInlines)];
        case "inlineCode":
          return [{ type: "inlineCode", value: node.value }];
        default:
          return null;
      }
    },
    toInline: (node, context) => {
      switch (node.type) {
        case "emphasis":
          return [emphasisToMdast(node, context.writeInlines)];
        case "strong":
          return [strongToMdast(node, context.writeInlines)];
        case "delete":
          return [deleteToMdast(node, context.writeInlines)];
        case "inlineCode":
          return [{ type: "inlineCode", value: node.value }];
        default:
          return null;
      }
    },
  },
  mdastTypes: ["emphasis", "strong", "delete", "inlineCode"],
  semanticTypes: ["emphasis", "strong", "delete", "inlineCode"],
} satisfies SyntaxRegistration;
