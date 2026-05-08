import { CodeExtension } from "@lexical/code";
import { CODE } from "@lexical/markdown";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";
import { CodeBlockControlsPlugin } from "./code-block-controls-plugin";
import { CodeHighlightPlugin } from "./code-highlight-plugin";
import { registerCodeKeyboardCommands } from "./code-keyboard";

export { codeBlockFromLexical, codeBlockToLexical } from "./lexical";
export { codeBlockFromMdast, codeBlockToMdast } from "./mdast";

export const CODE_MARKDOWN_SHORTCUT_TRANSFORMERS = [CODE];

export const CODE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/code",
  dependencies: [
    CodeExtension,
    configExtension(MarkdownShortcutExtension, {
      transformers: CODE_MARKDOWN_SHORTCUT_TRANSFORMERS,
    }),
  ],
  theme: {
    code: "block-editor__code",
  },
  register: registerCodeKeyboardCommands,
});

export const CODE_SYNTAX_REACT_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/code/react",
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [CodeHighlightPlugin, CodeBlockControlsPlugin],
    }),
  ],
});

export const CODE_SYNTAX = {
  id: "code",
  extension: CODE_SYNTAX_EXTENSION,
  lexicalNodeNames: ["CodeNode", "CodeHighlightNode"],
  mdastTypes: ["code"],
  semanticTypes: ["codeBlock"],
} satisfies SyntaxRegistration;
