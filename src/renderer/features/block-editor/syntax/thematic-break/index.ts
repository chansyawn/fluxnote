import {
  $createHorizontalRuleNode,
  HorizontalRuleExtension,
  HorizontalRuleNode,
} from "@lexical/extension";
import type { ElementTransformer } from "@lexical/markdown";
import { defineExtension } from "lexical";

import "./index.css";

export { thematicBreakFromLexical, thematicBreakToLexical } from "./lexical";

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
