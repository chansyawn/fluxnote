import { CodeExtension } from "@lexical/code";
import { CODE } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { CodeBlockControlsPlugin } from "./code-block-controls-plugin";
import { CodeHighlightPlugin } from "./code-highlight-plugin";
import { CodeKeyboardPlugin } from "./code-keyboard-plugin";

export { codeBlockFromLexical, codeBlockToLexical } from "./lexical";
export { codeBlockFromMdast, codeBlockToMdast } from "./mdast";

export const CODE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/code",
  dependencies: [CodeExtension],
  theme: {
    code: "block-editor__code",
  },
});

export const CODE_SYNTAX = {
  id: "code",
  extension: CODE_SYNTAX_EXTENSION,
  lexicalNodeNames: ["CodeNode", "CodeHighlightNode"],
  markdownShortcuts: [CODE],
  mdastTypes: ["code"],
  runtimePlugins: () => [
    <CodeKeyboardPlugin key="code-keyboard" />,
    <CodeHighlightPlugin key="code-highlight" />,
    <CodeBlockControlsPlugin key="code-block-controls" />,
  ],
  semanticTypes: ["codeBlock"],
} satisfies SyntaxRegistration;
