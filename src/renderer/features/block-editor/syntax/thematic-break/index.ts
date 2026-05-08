import {
  $createHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
} from "@lexical/extension";
import type { ElementTransformer } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";
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

export const THEMATIC_BREAK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/thematic-break",
  dependencies: [HorizontalRuleExtension],
  theme: {
    hr: "block-editor__horizontal-rule",
  },
});

export const THEMATIC_BREAK_SYNTAX = {
  id: "thematic-break",
  extension: THEMATIC_BREAK_SYNTAX_EXTENSION,
  lexicalNodeNames: ["HorizontalRuleNode"],
  markdownShortcuts: [THEMATIC_BREAK_SHORTCUT],
  mdastTypes: ["thematicBreak"],
  semanticTypes: ["thematicBreak"],
} satisfies SyntaxRegistration;
