import { $isCodeNode } from "@lexical/code";
import { $isTableCellNode } from "@lexical/table";
import {
  $findMatchingParent,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
  type BaseSelection,
  type LexicalEditor,
} from "lexical";

import { rootContentToLexical } from "../document/lexical-mdast";
import { normalizeMdast } from "../document/normalize-mdast";
import { parseMarkdownToMdast } from "../markdown/processor";

function isInsideCodeBlock(selection: BaseSelection | null): boolean {
  if (!$isRangeSelection(selection)) return false;
  for (
    let node: ReturnType<typeof selection.anchor.getNode> | null = selection.anchor.getNode();
    node;
    node = node.getParent()
  ) {
    if ($isCodeNode(node)) return true;
  }
  return false;
}

function isInsideTableCell(selection: BaseSelection | null): boolean {
  if (!$isRangeSelection(selection)) return false;
  return $isTableCellNode($findMatchingParent(selection.anchor.getNode(), $isTableCellNode));
}

export function insertMarkdownAtSelection(
  editor: LexicalEditor,
  markdown: string,
  selection: BaseSelection | null,
): void {
  const normalized = normalizeMdast(parseMarkdownToMdast(markdown));
  if (normalized.children.length === 0) {
    return;
  }

  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      const currentSelection = $getSelection();

      // Inside a fenced code block, markdown must be inserted verbatim — re-
      // parsing would corrupt code semantics.
      if (isInsideCodeBlock(currentSelection) && $isRangeSelection(currentSelection)) {
        currentSelection.insertRawText(markdown);
        return;
      }

      const nodes = normalized.children.flatMap(rootContentToLexical);
      if (nodes.length === 0) {
        return;
      }

      if ($isRangeSelection(currentSelection) || $isNodeSelection(currentSelection)) {
        if ($isRangeSelection(currentSelection) && isInsideTableCell(currentSelection)) {
          editor.dispatchCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, {
            nodes,
            selection: currentSelection,
          });
          return;
        }

        currentSelection.insertNodes(nodes);
        return;
      }

      $getRoot().append(...nodes);
      nodes.at(-1)?.selectEnd();
    },
    { discrete: true },
  );
}
