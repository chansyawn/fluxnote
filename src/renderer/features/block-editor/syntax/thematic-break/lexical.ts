import { $createHorizontalRuleNode, $isHorizontalRuleNode } from "@lexical/extension";
import type { LexicalNode } from "lexical";
import type { ThematicBreak } from "mdast";

export function thematicBreakToLexical(): LexicalNode {
  return $createHorizontalRuleNode();
}

export function thematicBreakFromLexical(node: LexicalNode): ThematicBreak | null {
  return $isHorizontalRuleNode(node) ? { type: "thematicBreak" } : null;
}
