import { defineExtension } from "lexical";

export { paragraphFromLexical, paragraphToLexical } from "./lexical";

export const PARAGRAPH_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/paragraph",
  theme: {
    paragraph: "block-editor__paragraph",
  },
});
