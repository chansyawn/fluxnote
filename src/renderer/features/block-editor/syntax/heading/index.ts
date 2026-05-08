import { HEADING } from "@lexical/markdown";
import { RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { headingTagToDepth, headingToLexical, toHeadingTag } from "./lexical";
export { headingFromMdast, headingToMdast } from "./mdast";

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
  extension: HEADING_SYNTAX_EXTENSION,
  lexicalNodeNames: ["HeadingNode"],
  markdownShortcuts: [HEADING],
  mdastTypes: ["heading"],
  semanticTypes: ["heading"],
} satisfies SyntaxRegistration;
