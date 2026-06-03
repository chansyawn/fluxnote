import type { LexicalEditor } from "lexical";

import { BLOCK_EDITOR_ACTION_DEFINITIONS } from "./action-definitions";
import type { BlockEditorActionState } from "./types";

export const DEFAULT_BLOCK_EDITOR_ACTION_STATE: BlockEditorActionState = {
  activeActions: Object.fromEntries(
    BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, false]),
  ) as BlockEditorActionState["activeActions"],
  disabledActions: Object.fromEntries(
    BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, false]),
  ) as BlockEditorActionState["disabledActions"],
};

export function readBlockEditorActionState(editor: LexicalEditor): BlockEditorActionState {
  return editor.getEditorState().read(() => {
    const context = { editor };
    return {
      activeActions: Object.fromEntries(
        BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, action.isActive(context)]),
      ) as BlockEditorActionState["activeActions"],
      disabledActions: Object.fromEntries(
        BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, action.isDisabled(context)]),
      ) as BlockEditorActionState["disabledActions"],
    };
  });
}

export function blockEditorActionStatesEqual(
  left: BlockEditorActionState,
  right: BlockEditorActionState,
): boolean {
  for (const action of BLOCK_EDITOR_ACTION_DEFINITIONS) {
    if (
      left.activeActions[action.id] !== right.activeActions[action.id] ||
      left.disabledActions[action.id] !== right.disabledActions[action.id]
    ) {
      return false;
    }
  }

  return true;
}
