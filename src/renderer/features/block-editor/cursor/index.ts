import "./index.css";
import {
  defineExtension,
  mergeRegister,
  RootNode,
  type LexicalEditor,
  type NodeKey,
} from "lexical";

import { registerCursorCommands } from "./cursor-commands";
import { $getSelectionGapCursorKey } from "./cursor-navigation";
import { $getRootGapCursorKeys, $normalizeRootGapCursors } from "./cursor-normalize";

export { filterGapCursorNodes } from "./cursor-normalize";
export {
  $createGapCursorParagraph,
  $isGapCursorParagraph,
  $promoteGapCursorParagraph,
} from "./cursor-state";

const GAP_CURSOR_CLASS = "block-editor__gap-cursor";
const GAP_CURSOR_ACTIVE_CLASS = "block-editor__gap-cursor--active";

function setElementClass(
  editor: LexicalEditor,
  key: NodeKey,
  className: string,
  enabled: boolean,
): void {
  const element = editor.getElementByKey(key);
  if (!element) {
    return;
  }

  element.classList.toggle(className, enabled);
}

function registerCursorDomSync(editor: LexicalEditor): () => void {
  let previousGapKeys = new Set<NodeKey>();
  let previousActiveKey: NodeKey | null = null;

  return editor.registerUpdateListener(({ editorState }) => {
    let nextGapKeys = new Set<NodeKey>();
    let nextActiveKey: NodeKey | null = null;

    editorState.read(() => {
      nextGapKeys = $getRootGapCursorKeys();
      nextActiveKey = $getSelectionGapCursorKey();
    });

    for (const key of previousGapKeys) {
      if (!nextGapKeys.has(key)) {
        setElementClass(editor, key, GAP_CURSOR_CLASS, false);
        setElementClass(editor, key, GAP_CURSOR_ACTIVE_CLASS, false);
      }
    }

    for (const key of nextGapKeys) {
      setElementClass(editor, key, GAP_CURSOR_CLASS, true);
      setElementClass(editor, key, GAP_CURSOR_ACTIVE_CLASS, key === nextActiveKey);
    }

    if (previousActiveKey && !nextGapKeys.has(previousActiveKey)) {
      setElementClass(editor, previousActiveKey, GAP_CURSOR_ACTIVE_CLASS, false);
    }

    previousGapKeys = nextGapKeys;
    previousActiveKey = nextActiveKey;
  });
}

export const CursorExtension = defineExtension({
  name: "fluxnotes/block-editor/cursor",
  register(editor) {
    return mergeRegister(
      registerCursorCommands(editor),
      registerCursorDomSync(editor),
      editor.registerNodeTransform(RootNode, () => {
        $normalizeRootGapCursors();
      }),
    );
  },
});
