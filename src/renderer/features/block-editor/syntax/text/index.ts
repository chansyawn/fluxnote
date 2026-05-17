import { $isCodeNode } from "@lexical/code";
import { $isListItemNode } from "@lexical/list";
import { $isTableCellNode } from "@lexical/table";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

import { hasAncestor } from "../container/selection";

const TAB_SPACES = "  ";

function isInsideOwnedTabContext(node: LexicalNode): boolean {
  return (
    hasAncestor(node, $isListItemNode) ||
    hasAncestor(node, $isCodeNode) ||
    hasAncestor(node, $isTableCellNode)
  );
}

function isPlainTextTabSelection(selection: RangeSelection): boolean {
  const boundaryNodes = [$getNodeByKey(selection.anchor.key), $getNodeByKey(selection.focus.key)];

  return (
    boundaryNodes.every((node) => !!node && !isInsideOwnedTabContext(node)) &&
    selection.getNodes().every((node) => !isInsideOwnedTabContext(node))
  );
}

function handlePlainTextTab(event: KeyboardEvent): boolean {
  if (event.shiftKey) {
    return false;
  }

  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !isPlainTextTabSelection(selection)) {
    return false;
  }

  event.preventDefault();
  selection.insertRawText(TAB_SPACES);
  return true;
}

function registerPlainTextTabCommand(editor: LexicalEditor): () => void {
  return editor.registerCommand(KEY_TAB_COMMAND, handlePlainTextTab, COMMAND_PRIORITY_LOW);
}

export const TEXT_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/text",
  register: registerPlainTextTabCommand,
});
