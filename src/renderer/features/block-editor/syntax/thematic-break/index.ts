import { $createHorizontalRuleNode, HorizontalRuleNode } from "@lexical/extension";
import type { ElementTransformer } from "@lexical/markdown";

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

export const THEMATIC_BREAK_SYNTAX = {
  id: "thematic-break",
  lexicalNodeNames: ["HorizontalRuleNode"],
  mdastTypes: ["thematicBreak"],
  nodes: [HorizontalRuleNode],
  markdownShortcuts: [THEMATIC_BREAK_SHORTCUT],
  semanticTypes: ["thematicBreak"],
  theme: {
    hr: "block-editor__horizontal-rule",
  },
} satisfies SyntaxRegistration;
