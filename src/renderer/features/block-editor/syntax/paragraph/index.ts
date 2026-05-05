import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { paragraphToLexical } from "./lexical";
export { paragraphFromMdast, paragraphToMdast } from "./mdast";

export const PARAGRAPH_SYNTAX = {
  id: "paragraph",
  mdastTypes: ["paragraph"],
  semanticTypes: ["paragraph", "text", "hardBreak"],
  theme: {
    paragraph: "block-editor__paragraph",
  },
} satisfies SyntaxRegistration;
