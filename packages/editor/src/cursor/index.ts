import { defineExtension, mergeRegister, RootNode } from "lexical";

import { registerCursorCommands } from "./cursor-commands";
import { registerCursorDomSync } from "./cursor-dom-sync";
import { registerCursorMouseCommands } from "./cursor-mouse";
import { $normalizeGapCursors } from "./cursor-normalize";

export { filterGapCursorNodes } from "./cursor-normalize";
export { $isGapCursorParagraph } from "./cursor-state";

export const CursorExtension = defineExtension({
  name: "fluxnotes/block-editor/cursor",
  register(editor) {
    return mergeRegister(
      registerCursorCommands(editor),
      registerCursorMouseCommands(editor),
      registerCursorDomSync(editor),
      editor.registerNodeTransform(RootNode, () => {
        $normalizeGapCursors();
      }),
    );
  },
});
