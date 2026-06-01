import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";

import { readBlockFormatFromSelection } from "../core/block-format";
import { BLOCK_EDITOR_INLINE_FORMATS } from "../toolbar/types";
import { BLOCK_EDITOR_ACTION_DEFINITIONS } from "./action-definitions";
import type { BlockEditorActionState } from "./types";

export const DEFAULT_BLOCK_EDITOR_ACTION_STATE: BlockEditorActionState = {
  blockFormat: "paragraph",
  disabledActions: Object.fromEntries(
    BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, false]),
  ) as BlockEditorActionState["disabledActions"],
  inlineFormats: {
    bold: false,
    inlineCode: false,
    italic: false,
    strikethrough: false,
  },
};

export function readBlockEditorActionState(editor: LexicalEditor): BlockEditorActionState {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    const inlineFormats = { ...DEFAULT_BLOCK_EDITOR_ACTION_STATE.inlineFormats };

    if ($isRangeSelection(selection)) {
      for (const format of BLOCK_EDITOR_INLINE_FORMATS) {
        inlineFormats[format] = selection.hasFormat(format === "inlineCode" ? "code" : format);
      }
    }

    const context = { editor };
    return {
      blockFormat: $isRangeSelection(selection) ? readBlockFormatFromSelection() : "paragraph",
      disabledActions: Object.fromEntries(
        BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, action.isDisabled(context)]),
      ) as BlockEditorActionState["disabledActions"],
      inlineFormats,
    };
  });
}

export function blockEditorActionStatesEqual(
  left: BlockEditorActionState,
  right: BlockEditorActionState,
): boolean {
  if (
    left.blockFormat !== right.blockFormat ||
    left.inlineFormats.bold !== right.inlineFormats.bold ||
    left.inlineFormats.inlineCode !== right.inlineFormats.inlineCode ||
    left.inlineFormats.italic !== right.inlineFormats.italic ||
    left.inlineFormats.strikethrough !== right.inlineFormats.strikethrough
  ) {
    return false;
  }

  for (const action of BLOCK_EDITOR_ACTION_DEFINITIONS) {
    if (left.disabledActions[action.id] !== right.disabledActions[action.id]) {
      return false;
    }
  }

  return true;
}
