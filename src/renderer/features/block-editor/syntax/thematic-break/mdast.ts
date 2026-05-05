import type { ThematicBreak } from "mdast";

import type { SemanticThematicBreak } from "../../core/semantic/document";

export function thematicBreakFromMdast(): SemanticThematicBreak {
  return { type: "thematicBreak" };
}

export function thematicBreakToMdast(): ThematicBreak {
  return { type: "thematicBreak" };
}
