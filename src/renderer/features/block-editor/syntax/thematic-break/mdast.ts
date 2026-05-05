import type { ThematicBreak } from "mdast";

import type { SemanticThematicBreak } from "../../model";

export function thematicBreakFromMdast(): SemanticThematicBreak {
  return { type: "thematicBreak" };
}

export function thematicBreakToMdast(): ThematicBreak {
  return { type: "thematicBreak" };
}
