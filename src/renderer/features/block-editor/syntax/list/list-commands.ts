import { ListItemNode } from "@lexical/list";
import type { Transformer } from "@lexical/markdown";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  type LexicalEditor,
  type RangeSelection,
} from "lexical";

import { registerContainerShortcutReplay } from "../container/keyboard";
import {
  getCurrentListItem,
  getCurrentListItemBlock,
  getSelectedListItems,
} from "./list-selection";
import {
  applyListContainerMarkdownShortcutAtSelection,
  applyListContainerMultilineShortcutAtSelection,
} from "./list-shortcuts";
import {
  collapseStructuredBlockAtStart,
  ensureListItemHasParagraph,
  hasNestedListAfterCurrentParagraph,
  indentListItemSubtree,
  insertBlockInsideListItem,
  isCursorAtLastParagraphEnd,
  isCursorAtListMarkerPosition,
  isEmptyListItem,
  isSingleParagraphListItem,
  isStructuredListItemBlock,
  mergeListItemIntoPreviousSibling,
  normalizeListItemForEditing,
  outdentListItemSubtree,
  splitListItemBlocksAtSelection,
  splitListItemAtSelection,
  unwrapListItemToBlocks,
} from "./list-structure";

/*
 * List keyboard commands only own list-level structure changes. Returning false
 * deliberately delegates the keystroke to the focused child block or Lexical's
 * default editing behavior.
 */

function getSelectionFromCommand(): RangeSelection | null {
  const selection = $getSelection();
  return $isRangeSelection(selection) && selection.isCollapsed() ? selection : null;
}

/*
 * Alt+Enter stays inside the current list item when possible:
 * - single paragraph item: insert another paragraph in the same item;
 * - multi-block item: split the item into sibling list items;
 * - structured block: split at the block boundary, not inside block internals.
 */
function handleAltEnter(selection: RangeSelection): boolean {
  const listItem = getCurrentListItem(selection);
  if (!listItem) {
    return false;
  }

  normalizeListItemForEditing(listItem, selection);
  const currentBlock = getCurrentListItemBlock(selection, listItem);
  if (isSingleParagraphListItem(listItem) && !isStructuredListItemBlock(currentBlock)) {
    return insertBlockInsideListItem(selection);
  }

  return splitListItemBlocksAtSelection(listItem, selection);
}

/*
 * Enter key policy, in priority order:
 * - Shift+Enter belongs to soft-break handling;
 * - multiline Markdown shortcuts run before list splitting;
 * - Alt+Enter inserts/splits blocks inside the current item;
 * - empty items exit one list level;
 * - structured children keep their own Enter behavior;
 * - paragraph endings create the next list item.
 */
function handleEnter(
  event: KeyboardEvent | null,
  transformers: ReadonlyArray<Transformer>,
): boolean {
  if (event?.shiftKey) {
    return false;
  }

  const selection = getSelectionFromCommand();
  if (!selection) {
    return false;
  }

  const listItem = getCurrentListItem(selection);
  if (!listItem) {
    return false;
  }

  normalizeListItemForEditing(listItem, selection);

  if (applyListContainerMultilineShortcutAtSelection(selection, transformers)) {
    event?.preventDefault();
    return true;
  }

  if (event?.altKey) {
    event.preventDefault();
    return handleAltEnter(selection);
  }

  ensureListItemHasParagraph(listItem);

  if (isEmptyListItem(listItem)) {
    event?.preventDefault();
    return outdentListItemSubtree(listItem);
  }

  const currentBlock = getCurrentListItemBlock(selection, listItem);
  if (!currentBlock || isStructuredListItemBlock(currentBlock)) {
    return false;
  }

  if (
    isSingleParagraphListItem(listItem) ||
    isCursorAtLastParagraphEnd(selection, listItem) ||
    hasNestedListAfterCurrentParagraph(selection, listItem)
  ) {
    event?.preventDefault();
    return splitListItemAtSelection(listItem, selection);
  }

  return false;
}

/*
 * Tab changes list depth for selected items:
 * - parent/child overlap moves only the selected parent subtree;
 * - Tab nests items under the previous sibling;
 * - Shift+Tab promotes items or unwraps top-level items.
 */
function handleTab(event: KeyboardEvent): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const items = getSelectedListItems(selection);
  if (items.length === 0) {
    return false;
  }

  event.preventDefault();
  for (const item of items) {
    if (event.shiftKey) {
      outdentListItemSubtree(item);
    } else {
      indentListItemSubtree(item);
    }
  }
  return true;
}

/*
 * Backspace only owns list structure at safe boundaries:
 * - structured block start first collapses/exits that child block;
 * - marker position merges into the previous item when available;
 * - first item marker position unwraps or outdents the item;
 * - all other positions delegate to normal text/block editing.
 */
function handleBackspace(event: KeyboardEvent): boolean {
  const selection = getSelectionFromCommand();
  if (!selection) {
    return false;
  }

  const listItem = getCurrentListItem(selection);
  if (!listItem) {
    return false;
  }

  normalizeListItemForEditing(listItem, selection);
  if (collapseStructuredBlockAtStart(selection, listItem)) {
    event.preventDefault();
    return true;
  }

  if (!isCursorAtListMarkerPosition(selection, listItem)) {
    return false;
  }

  event.preventDefault();
  return mergeListItemIntoPreviousSibling(listItem) || unwrapListItemToBlocks(listItem);
}

/*
 * Register before Lexical's default list commands so FluxNote can preserve the
 * block-container model, while still replaying Markdown shortcuts after text
 * updates inside list items.
 */
export function registerListKeyboardCommands(
  editor: LexicalEditor,
  transformers: ReadonlyArray<Transformer>,
): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => handleEnter(event, transformers),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(KEY_TAB_COMMAND, handleTab, COMMAND_PRIORITY_HIGH),
    editor.registerCommand(KEY_BACKSPACE_COMMAND, handleBackspace, COMMAND_PRIORITY_HIGH),
    editor.registerNodeTransform(ListItemNode, (listItem) => {
      /*
       * Keep Lexical-created list items aligned with imported Markdown lists:
       * inline text is wrapped, empty items become editable, and structured
       * children are preserved.
       */
      const selection = $getSelection();
      normalizeListItemForEditing(listItem, $isRangeSelection(selection) ? selection : null);
    }),
    registerContainerShortcutReplay(editor, () =>
      applyListContainerMarkdownShortcutAtSelection(transformers),
    ),
  );
}
