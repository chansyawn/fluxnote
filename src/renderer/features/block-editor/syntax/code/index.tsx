import { CodeShikiExtension, ShikiTokenizer } from "@lexical/code-shiki";
import { CODE } from "@lexical/markdown";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { CodeBlockControlsDecorator } from "./code-block-controls-decorator";
import { registerCodeKeyboardCommands } from "./code-keyboard";
import { CODE_SHIKI_DEFAULT_THEME, CodeShikiThemeDecorator } from "./code-shiki-theme-decorator";

export { codeBlockFromLexical, codeBlockToLexical } from "./lexical";

export const CODE_MARKDOWN_SHORTCUT_TRANSFORMERS = [CODE];

const BLOCK_EDITOR_SHIKI_TOKENIZER = {
  ...ShikiTokenizer,
  defaultLanguage: "plain",
  defaultTheme: CODE_SHIKI_DEFAULT_THEME,
};

export const CODE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/code",
  dependencies: [
    configExtension(CodeShikiExtension, {
      disabled: false,
      tokenizer: BLOCK_EDITOR_SHIKI_TOKENIZER,
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
      decorators: [CodeShikiThemeDecorator, CodeBlockControlsDecorator],
    }),
  ],
});
