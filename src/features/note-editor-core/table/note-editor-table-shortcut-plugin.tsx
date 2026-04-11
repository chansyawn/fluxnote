import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isTableCellNode, $isTableRowNode, type TableRowNode } from "@lexical/table";
import {
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
} from "lexical";
import { useEffect } from "react";

import {
  createTableNodeFromMarkdownLines,
  isMarkdownTableDividerRow,
  isMarkdownTableRow,
} from "@/features/note-editor-core/markdown/note-editor-markdown";

function focusFirstBodyCell(tableNode: ReturnType<typeof createTableNodeFromMarkdownLines>): void {
  const firstBodyRow = tableNode.getChildren().find((child, index): child is TableRowNode => {
    return index > 0 && $isTableRowNode(child);
  });

  if (!firstBodyRow) {
    tableNode.selectStart();
    return;
  }

  const firstBodyCell = firstBodyRow.getFirstChild();

  if ($isTableCellNode(firstBodyCell)) {
    firstBodyCell.selectStart();
    return;
  }

  tableNode.selectStart();
}

export function NoteEditorTableShortcutPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        let didConvertTable = false;

        editor.update(() => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }

          const anchorNode = selection.anchor.getNode();

          if (!$isTextNode(anchorNode)) {
            return;
          }

          if (selection.anchor.offset !== anchorNode.getTextContent().length) {
            return;
          }

          const parentNode = anchorNode.getParent();

          if (!$isParagraphNode(parentNode) || parentNode.getFirstChild() !== anchorNode) {
            return;
          }

          const rootNode = parentNode.getParent();

          if (!$isRootOrShadowRoot(rootNode)) {
            return;
          }

          const dividerLine = anchorNode.getTextContent();

          if (!isMarkdownTableDividerRow(dividerLine)) {
            return;
          }

          const previousSibling = parentNode.getPreviousSibling();

          if (!$isParagraphNode(previousSibling)) {
            return;
          }

          const headerLine = previousSibling.getTextContent();

          if (!isMarkdownTableRow(headerLine)) {
            return;
          }

          const tableNode = createTableNodeFromMarkdownLines([headerLine, dividerLine], {
            appendEmptyBodyRow: true,
          });

          previousSibling.insertBefore(tableNode, false);
          previousSibling.remove();
          parentNode.remove();
          focusFirstBodyCell(tableNode);
          didConvertTable = true;
        });

        if (!didConvertTable) {
          return false;
        }

        event?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
