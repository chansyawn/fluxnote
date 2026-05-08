import "./index.css";
import { $isParagraphNode, defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import { paragraphToLexical } from "./lexical";
import { paragraphFromMdast, paragraphToMdast } from "./mdast";

export { paragraphToLexical } from "./lexical";
export { paragraphFromMdast, paragraphToMdast } from "./mdast";

export const PARAGRAPH_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/paragraph",
  theme: {
    paragraph: "block-editor__paragraph",
  },
});

export const PARAGRAPH_SYNTAX = {
  id: "paragraph",
  extension: PARAGRAPH_SYNTAX_EXTENSION,
  lexical: {
    fromBlock: (node, context) =>
      $isParagraphNode(node)
        ? [{ children: context.readInlines(node.getChildren()), type: "paragraph" }]
        : null,
    toBlock: (node, context) =>
      node.type === "paragraph" ? [paragraphToLexical(node, context.writeInline)] : null,
  },
  mdast: {
    fromBlock: (node, context) =>
      node.type === "paragraph" ? [paragraphFromMdast(node, context.readInlines)] : null,
    toBlock: (node, context) =>
      node.type === "paragraph" ? [paragraphToMdast(node, context.writeInlines)] : null,
  },
  mdastTypes: ["paragraph"],
  semanticTypes: ["paragraph", "text"],
} satisfies SyntaxRegistration;
