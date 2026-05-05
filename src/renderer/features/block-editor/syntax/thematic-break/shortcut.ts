import { $createHorizontalRuleNode, HorizontalRuleNode } from "@lexical/extension";
import type { ElementTransformer } from "@lexical/markdown";

export const THEMATIC_BREAK: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: () => null,
  regExp: /^---\s?$/,
  replace: (parentNode) => {
    parentNode.replace($createHorizontalRuleNode());
  },
  type: "element",
};
