import {
  $createParagraphNode,
  $getState,
  $isParagraphNode,
  $setState,
  createState,
  type LexicalNode,
  type ParagraphNode,
} from "lexical";

export const gapCursorState = createState("fluxnotesGapCursor", {
  parse: (value): boolean => value === true,
  resetOnCopyNode: true,
});

export function $createGapCursorParagraph(): ParagraphNode {
  return $setState($createParagraphNode(), gapCursorState, true);
}

export function $isGapCursorParagraph(node: LexicalNode | null | undefined): node is ParagraphNode {
  return $isParagraphNode(node) && $getState(node, gapCursorState) === true;
}

export function $promoteGapCursorParagraph(node: LexicalNode | null | undefined): boolean {
  if (!$isGapCursorParagraph(node)) {
    return false;
  }

  $setState(node, gapCursorState, false);
  return true;
}
