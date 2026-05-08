import {
  $createNodeSelection,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  isDOMNode,
  type LexicalEditor,
} from "lexical";

import { $isImageNode } from "./image-node";

export function registerImageSelectionCommands(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    CLICK_COMMAND,
    (event) => {
      if (!isDOMNode(event.target)) {
        return false;
      }

      const node = $getNearestNodeFromDOMNode(event.target);
      if (!$isImageNode(node)) {
        return false;
      }

      event.preventDefault();
      let selection = $getSelection();
      if (!event.shiftKey || !$isNodeSelection(selection)) {
        selection = $createNodeSelection();
        $setSelection(selection);
      }

      if ($isNodeSelection(selection)) {
        selection.add(node.getKey());
      }
      return true;
    },
    COMMAND_PRIORITY_LOW,
  );
}
