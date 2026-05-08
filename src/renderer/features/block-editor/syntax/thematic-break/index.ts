import {
  $createHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
} from "@lexical/extension";
import type { ElementTransformer } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";

export { thematicBreakFromLexical, thematicBreakToLexical } from "./lexical";
export { thematicBreakFromMdast, thematicBreakToMdast } from "./mdast";

const THEMATIC_BREAK_SHORTCUT: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: () => null,
  regExp: /^---\s?$/,
  replace: (parentNode) => {
    parentNode.replace($createHorizontalRuleNode());
  },
  type: "element",
};

export const THEMATIC_BREAK_MARKDOWN_SHORTCUT_TRANSFORMERS = [THEMATIC_BREAK_SHORTCUT];

export const THEMATIC_BREAK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/thematic-break",
  dependencies: [
    HorizontalRuleExtension,
    configExtension(MarkdownShortcutExtension, {
      transformers: THEMATIC_BREAK_MARKDOWN_SHORTCUT_TRANSFORMERS,
    }),
  ],
  theme: {
    hr: "block-editor__horizontal-rule",
  },
});

export const THEMATIC_BREAK_SYNTAX = {
  id: "thematic-break",
  extension: THEMATIC_BREAK_SYNTAX_EXTENSION,
  lexicalNodeNames: ["HorizontalRuleNode"],
  mdastTypes: ["thematicBreak"],
  semanticTypes: ["thematicBreak"],
} satisfies SyntaxRegistration;
