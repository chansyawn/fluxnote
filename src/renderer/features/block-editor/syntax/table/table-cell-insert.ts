import { $isTableCellNode } from "@lexical/table";
import {
  $createTextNode,
  $findMatchingParent,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import { createTableCellInsertionContent } from "./table-cell-content";

function hasNonWhitespaceTextAt(selection: BaseSelection, side: "after" | "before"): boolean {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const node = selection.anchor.getNode();
  if (!$isTextNode(node)) {
    return false;
  }

  const offset = side === "before" ? selection.anchor.offset - 1 : selection.anchor.offset;
  const text = node.getTextContent()[offset];
  return text !== undefined && !/\s/.test(text);
}

function insertNodesIntoTableCell(sourceNodes: LexicalNode[], selection: BaseSelection): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }

  if (!selection.isCollapsed()) {
    selection.removeText();
  }

  const anchorNode = selection.anchor.getNode();
  const cell = $findMatchingParent(anchorNode, $isTableCellNode);
  if (!$isTableCellNode(cell)) {
    return false;
  }

  const content = createTableCellInsertionContent(sourceNodes);
  if (content.nodes.length === 0) {
    return true;
  }

  const nodes = [...content.nodes];
  if (content.startsWithBlockLiteral && hasNonWhitespaceTextAt(selection, "before")) {
    nodes.unshift($createTextNode(" "));
  }
  if (content.endsWithBlockLiteral && hasNonWhitespaceTextAt(selection, "after")) {
    nodes.push($createTextNode(" "));
  }

  selection.insertNodes(nodes);
  return true;
}

export function registerTableCellClipboardInsertion(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
    ({ nodes, selection }) => insertNodesIntoTableCell(nodes, selection),
    COMMAND_PRIORITY_HIGH,
  );
}
