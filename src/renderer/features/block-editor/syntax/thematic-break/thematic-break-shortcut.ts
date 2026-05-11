import { $createHorizontalRuleNode, HorizontalRuleNode } from "@lexical/extension";
import type { ElementTransformer, MultilineElementTransformer } from "@lexical/markdown";
import type { ElementNode } from "lexical";

const THEMATIC_BREAK_REG_EXP = /^---\s?$/;

function replaceWithThematicBreak(parentNode: ElementNode, isImport: boolean): void {
  const rule = $createHorizontalRuleNode();

  if (isImport || parentNode.getNextSibling()) {
    parentNode.replace(rule);
  } else {
    parentNode.insertBefore(rule);
  }

  rule.selectNext();
}

export const THEMATIC_BREAK_SPACE_SHORTCUT: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: () => null,
  regExp: THEMATIC_BREAK_REG_EXP,
  replace: (parentNode, _children, _match, isImport) => {
    replaceWithThematicBreak(parentNode, isImport);
  },
  type: "element",
};

export const THEMATIC_BREAK_ENTER_SHORTCUT: MultilineElementTransformer = {
  dependencies: [HorizontalRuleNode],
  regExpEnd: { optional: true, regExp: /^$/ },
  regExpStart: /^---$/,
  replace: (parentNode, _children, _startMatch, _endMatch, _linesInBetween, isImport) => {
    if (isImport) {
      return false;
    }

    replaceWithThematicBreak(parentNode, false);
  },
  type: "multiline-element",
};

export const THEMATIC_BREAK_MARKDOWN_SHORTCUTS = [
  THEMATIC_BREAK_SPACE_SHORTCUT,
  THEMATIC_BREAK_ENTER_SHORTCUT,
];
