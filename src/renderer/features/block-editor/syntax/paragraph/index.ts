import "./index.css";
import { defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";

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
  mdastTypes: ["paragraph"],
  semanticTypes: ["paragraph", "text"],
} satisfies SyntaxRegistration;
