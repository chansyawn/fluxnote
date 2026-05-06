import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { CODE } from "@lexical/markdown";
import { createElement } from "react";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { CodeBlockControlsPlugin } from "./code-block-controls-plugin";
import { CodeHighlightPlugin } from "./code-highlight-plugin";

export { codeBlockFromLexical, codeBlockToLexical } from "./lexical";
export { codeBlockFromMdast, codeBlockToMdast } from "./mdast";

export const CODE_SYNTAX = {
  id: "code",
  lexicalNodeNames: ["CodeNode", "CodeHighlightNode"],
  mdastTypes: ["code"],
  nodes: [CodeNode, CodeHighlightNode],
  markdownShortcuts: [CODE],
  runtimePlugins: () => [
    createElement(CodeHighlightPlugin, { key: "code-highlight" }),
    createElement(CodeBlockControlsPlugin, { key: "code-block-controls" }),
  ],
  semanticTypes: ["codeBlock"],
  theme: {
    code: "block-editor__code",
  },
} satisfies SyntaxRegistration;
