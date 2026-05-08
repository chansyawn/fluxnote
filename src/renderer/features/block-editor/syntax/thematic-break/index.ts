import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
} from "@lexical/extension";
import type { ElementTransformer } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { thematicBreakFromLexical, thematicBreakToLexical } from "./lexical";
import { thematicBreakFromMdast, thematicBreakToMdast } from "./mdast";

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
  dependencies: [HorizontalRuleExtension],
  theme: {
    hr: "block-editor__horizontal-rule",
  },
});

export const THEMATIC_BREAK_SYNTAX = {
  id: "thematic-break",
  extension: THEMATIC_BREAK_SYNTAX_EXTENSION,
  lexical: {
    fromBlock: (node) => ($isHorizontalRuleNode(node) ? [thematicBreakFromLexical(node)] : null),
    toBlock: (node) => (node.type === "thematicBreak" ? [thematicBreakToLexical()] : null),
  },
  lexicalNodeNames: ["HorizontalRuleNode"],
  markdownShortcuts: THEMATIC_BREAK_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromBlock: (node) => (node.type === "thematicBreak" ? [thematicBreakFromMdast()] : null),
    toBlock: (node) => (node.type === "thematicBreak" ? [thematicBreakToMdast()] : null),
  },
  mdastTypes: ["thematicBreak"],
  semanticTypes: ["thematicBreak"],
} satisfies SyntaxRegistration;
