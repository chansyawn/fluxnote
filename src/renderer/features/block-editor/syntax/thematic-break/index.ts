import "./index.css";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/extension";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

export const thematicBreakModule: MarkdownSyntaxModule = {
  exportMdast: {
    horizontalrule: (node) => ($isHorizontalRuleNode(node) ? [{ type: "thematicBreak" }] : []),
  },
  importMdast: {
    thematicBreak: () => [$createHorizontalRuleNode()],
  },
  lexicalNodes: [HorizontalRuleNode],
  name: "thematic-break",
  theme: {
    hr: "block-editor__horizontal-rule",
  },
};
