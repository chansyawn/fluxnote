import { HEADING } from "@lexical/markdown";
import { HeadingNode } from "@lexical/rich-text";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { headingTagToDepth, headingToLexical, toHeadingTag } from "./lexical";
export { headingFromMdast, headingToMdast } from "./mdast";

export const HEADING_SYNTAX = {
  id: "heading",
  lexicalNodeNames: ["HeadingNode"],
  mdastTypes: ["heading"],
  nodes: [HeadingNode],
  markdownShortcuts: [HEADING],
  semanticTypes: ["heading"],
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
} satisfies SyntaxRegistration;
