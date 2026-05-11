import { $isHorizontalRuleNode } from "@lexical/extension";
import {
  $createNodeSelection,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  mergeRegister,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

export function $selectThematicBreak(node: LexicalNode | null | undefined): boolean {
  if (!$isHorizontalRuleNode(node)) {
    return false;
  }

  const selection = $createNodeSelection();
  selection.add(node.getKey());
  $setSelection(selection);
  return true;
}

export function $deleteSelectedThematicBreaks(): boolean {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return false;
  }

  const nodes = selection.getNodes();
  if (nodes.length === 0 || !nodes.every($isHorizontalRuleNode)) {
    return false;
  }

  for (const node of nodes) {
    node.remove();
  }
  return true;
}

function deleteSelectedThematicBreaks(event: KeyboardEvent | null): boolean {
  const handled = $deleteSelectedThematicBreaks();
  if (handled) {
    event?.preventDefault();
  }
  return handled;
}

export function registerThematicBreakCommands(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      deleteSelectedThematicBreaks,
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(KEY_DELETE_COMMAND, deleteSelectedThematicBreaks, COMMAND_PRIORITY_HIGH),
  );
}
