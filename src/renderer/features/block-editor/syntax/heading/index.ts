import { HEADING } from "@lexical/markdown";
import { $isHeadingNode, RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { headingTagToDepth, headingToLexical } from "./lexical";
import { headingFromMdast, headingToMdast } from "./mdast";

export { headingTagToDepth, headingToLexical, toHeadingTag } from "./lexical";
export { headingFromMdast, headingToMdast } from "./mdast";

export const HEADING_MARKDOWN_SHORTCUT_TRANSFORMERS = [HEADING];

export const HEADING_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/heading",
  dependencies: [RichTextExtension],
  theme: {
    heading: {
      h1: "block-editor__heading block-editor__heading--h1",
      h2: "block-editor__heading block-editor__heading--h2",
      h3: "block-editor__heading block-editor__heading--h3",
      h4: "block-editor__heading block-editor__heading--h4",
      h5: "block-editor__heading block-editor__heading--h5",
      h6: "block-editor__heading block-editor__heading--h6",
    },
  },
});

export const HEADING_SYNTAX = {
  id: "heading",
  extensions: [HEADING_SYNTAX_EXTENSION],
  lexical: {
    fromBlock: (node, context) =>
      $isHeadingNode(node)
        ? [
            {
              children: context.readInlines(node.getChildren()),
              depth: headingTagToDepth(node.getTag()),
              type: "heading",
            },
          ]
        : null,
    toBlock: (node, context) =>
      node.type === "heading" ? [headingToLexical(node, context.writeInline)] : null,
  },
  lexicalNodeNames: ["HeadingNode"],
  markdownShortcuts: HEADING_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromBlock: (node, context) =>
      node.type === "heading" ? [headingFromMdast(node, context.readInlines)] : null,
    toBlock: (node, context) =>
      node.type === "heading" ? [headingToMdast(node, context.writeInlines)] : null,
  },
  mdastTypes: ["heading"],
  semanticTypes: ["heading"],
} satisfies SyntaxRegistration;
