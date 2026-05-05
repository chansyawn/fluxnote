import { $createHorizontalRuleNode, type HorizontalRuleNode } from "@lexical/extension";
import type { LexicalNode } from "lexical";

import type { SemanticThematicBreak } from "../../model";

export function thematicBreakToLexical(): LexicalNode {
  return $createHorizontalRuleNode();
}

export function thematicBreakFromLexical(_: HorizontalRuleNode): SemanticThematicBreak {
  return { type: "thematicBreak" };
}
