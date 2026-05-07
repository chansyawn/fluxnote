import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createNodeSelection,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  isDOMNode,
} from "lexical";
import { useEffect } from "react";

import { $isImageNode } from "./image-node";

export function ImageSelectionPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
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
  }, [editor]);

  return null;
}
