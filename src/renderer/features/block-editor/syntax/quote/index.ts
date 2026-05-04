import "./index.css";
import { QUOTE } from "@lexical/markdown";
import { $createQuoteNode, $isQuoteNode, QuoteNode } from "@lexical/rich-text";
import type { BlockContent, Parent } from "mdast";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

export const quoteModule: MarkdownSyntaxModule = {
  exportMdast: {
    quote: (node, ctx) => {
      if (!$isQuoteNode(node)) {
        return [];
      }

      return [
        {
          children: ctx.exportChildren(node) as BlockContent[],
          type: "blockquote",
        },
      ];
    },
  },
  importMdast: {
    blockquote: (node, ctx, formats) => {
      const quote = $createQuoteNode();
      quote.append(...ctx.importChildren(node as Parent, formats));
      return [quote];
    },
  },
  lexicalNodes: [QuoteNode],
  markdownTransformers: [QUOTE],
  name: "quote",
  theme: {
    quote: "block-editor__quote",
  },
};
