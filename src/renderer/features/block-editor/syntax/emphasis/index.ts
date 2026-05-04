import "./index.css";
import { BOLD_STAR, INLINE_CODE, ITALIC_STAR, STRIKETHROUGH } from "@lexical/markdown";
import type { TextFormatType } from "lexical";
import type { Parent } from "mdast";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

function appendFormat(
  formats: ReadonlyArray<TextFormatType>,
  format: TextFormatType,
): ReadonlyArray<TextFormatType> {
  return formats.includes(format) ? formats : [...formats, format];
}

export const emphasisModule: MarkdownSyntaxModule = {
  importMdast: {
    delete: (node, ctx, formats) =>
      ctx.importChildren(node as Parent, appendFormat(formats, "strikethrough")),
    emphasis: (node, ctx, formats) =>
      ctx.importChildren(node as Parent, appendFormat(formats, "italic")),
    inlineCode: (node, ctx, formats) => {
      if (!("value" in node) || typeof node.value !== "string") {
        return [];
      }

      return ctx.importNode({ type: "text", value: node.value }, appendFormat(formats, "code"));
    },
    strong: (node, ctx, formats) =>
      ctx.importChildren(node as Parent, appendFormat(formats, "bold")),
  },
  markdownTransformers: [BOLD_STAR, ITALIC_STAR, STRIKETHROUGH, INLINE_CODE],
  name: "emphasis",
  theme: {
    text: {
      bold: "block-editor__text--strong",
      code: "block-editor__inline-code",
      italic: "block-editor__text--emphasis",
      strikethrough: "block-editor__text--strikethrough",
    },
  },
};
