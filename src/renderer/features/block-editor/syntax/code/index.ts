import { CodeNode } from "@lexical/code";
import { CODE } from "@lexical/markdown";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { codeBlockFromLexical, codeBlockToLexical } from "./lexical";
export { codeBlockFromMdast, codeBlockToMdast } from "./mdast";

export const CODE_SYNTAX = {
  id: "code",
  lexicalNodeNames: ["CodeNode"],
  mdastTypes: ["code"],
  nodes: [CodeNode],
  markdownShortcuts: [CODE],
  semanticTypes: ["codeBlock"],
  theme: {
    code: "block-editor__code",
  },
} satisfies SyntaxRegistration;
