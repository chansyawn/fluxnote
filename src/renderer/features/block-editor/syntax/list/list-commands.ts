import { ListItemNode } from "@lexical/list";
import type { Transformer } from "@lexical/markdown";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_HIGH,
  HISTORIC_TAG,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  type LexicalEditor,
  type NodeKey,
  type RangeSelection,
} from "lexical";

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
 * Keyboard handling is split along ownership boundaries:
 *
 * - list-commands decides whether a keystroke should affect list structure;
 * - list-structure performs tree mutations on ListNode/ListItemNode subtrees;
 * - paragraph, quote, code and other block nodes keep their own internal editing
 *   behavior whenever this module returns false.
 *
 * This is important for WYSIWYG Markdown because a list item can contain many
 * block children. Enter inside a code block should still be a code-block newline,
 * while Enter at the end of the final paragraph should create the next list item.
 */

function getSelectionFromCommand(): RangeSelection | null {
  const selection = $getSelection();
  return $isRangeSelection(selection) && selection.isCollapsed() ? selection : null;
}

function handleAltEnter(selection: RangeSelection): boolean {
  const listItem = getCurrentListItem(selection);
  if (!listItem) {
    return false;
  }

  normalizeListItemForEditing(listItem, selection);
  const currentBlock = getCurrentListItemBlock(selection, listItem);
  /*
   * Alt+Enter rules:
   *
   * - single paragraph item: insert a new paragraph block inside the current
   *   list item;
   * - multi-block item: split the current item into two sibling list items;
   * - structured block context: split at the list-item block boundary instead of
   *   reimplementing quote/code internals;
   * - split result: blocks before the cursor stay in the current item, and
   *   blocks after the cursor move to the new sibling item.
   */
  if (isSingleParagraphListItem(listItem) && !isStructuredListItemBlock(currentBlock)) {
    return insertBlockInsideListItem(selection);
  }

  return splitListItemBlocksAtSelection(listItem, selection);
}

function handleEnter(
  event: KeyboardEvent | null,
  transformers: ReadonlyArray<Transformer>,
): boolean {
  /*
   * Shift+Enter rules:
   *
   * - SoftBreakShortcutPlugin owns the key;
   * - this handler returns false before any list mutation;
   * - list splitting and block insertion never run for Shift+Enter.
   */
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

  /*
   * Enter on an empty item:
   *
   * - nested item: promote it one list level;
   * - top-level item: unwrap it into ordinary blocks;
   * - both paths keep an editable paragraph so the user can continue typing.
   */
  if (isEmptyListItem(listItem)) {
    event?.preventDefault();
    return outdentListItemSubtree(listItem);
  }

  const currentBlock = getCurrentListItemBlock(selection, listItem);
  /*
   * Enter inside structured blocks:
   *
   * - quote/code/nested-list children own their internal Enter behavior;
   * - the list handler returns false instead of forcing a list split;
   * - block-specific newline, split or exit behavior remains local to that node.
   */
  if (!currentBlock || isStructuredListItemBlock(currentBlock)) {
    return false;
  }

  /*
   * Enter on paragraph blocks:
   *
   * - single paragraph item: split into a new sibling list item;
   * - final paragraph in a multi-block item: split into a new sibling list item;
   * - paragraph before a nested list: split so the nested list follows the new
   *   sibling item;
   * - non-final paragraph in a multi-block item: return false so paragraph
   *   editing stays inside the current list item.
   */
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
  /*
   * Tab and Shift+Tab rules:
   *
   * - selection is normalized so parent/child overlap moves only the parent;
   * - Tab moves each selected item under the previous sibling's nested list;
   * - Shift+Tab promotes each selected item one level or unwraps top-level
   *   items into ordinary blocks;
   * - moving the ListItemNode itself preserves all block children and nested
   *   lists under that item.
   */
  for (const item of items) {
    if (event.shiftKey) {
      outdentListItemSubtree(item);
    } else {
      indentListItemSubtree(item);
    }
  }
  return true;
}

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
  /*
   * Backspace at structured block start:
   *
   * - quote/code children first receive collapseAtStart;
   * - the first Backspace exits the structured child wrapper;
   * - list marker merge/outdent is skipped for this keypress.
   */
  if (collapseStructuredBlockAtStart(selection, listItem)) {
    event.preventDefault();
    return true;
  }

  /*
   * Backspace at list marker:
   *
   * - only the start of the first paragraph child counts as the marker position;
   * - with a previous sibling, append this item's blocks to that sibling;
   * - without a previous sibling, outdent or unwrap this item;
   * - all other cursor positions delegate to the active block or Lexical default.
   */
  if (!isCursorAtListMarkerPosition(selection, listItem)) {
    return false;
  }

  event.preventDefault();
  return mergeListItemIntoPreviousSibling(listItem) || unwrapListItemToBlocks(listItem);
}

interface PendingShortcutSelection {
  anchorKey: NodeKey;
  anchorOffset: number;
}

function readPendingShortcutSelection(
  dirtyLeaves: ReadonlySet<NodeKey>,
): PendingShortcutSelection | null {
  /*
   * The update listener replays list-container shortcuts after text changes.
   * It only considers the currently dirty text leaf so ordinary editor updates
   * do not repeatedly scan or transform stable list content.
   */
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchorNode = $getNodeByKey(selection.anchor.key);
  if (
    !$isTextNode(anchorNode) ||
    !anchorNode.isAttached() ||
    !dirtyLeaves.has(anchorNode.getKey())
  ) {
    return null;
  }

  return {
    anchorKey: anchorNode.getKey(),
    anchorOffset: selection.anchor.offset,
  };
}

function restoreShortcutSelection({ anchorKey, anchorOffset }: PendingShortcutSelection): boolean {
  const node = $getNodeByKey(anchorKey);
  if (!$isTextNode(node) || !node.isAttached()) {
    return false;
  }

  node.select(anchorOffset, anchorOffset);
  return true;
}

export function registerListKeyboardCommands(
  editor: LexicalEditor,
  transformers: ReadonlyArray<Transformer>,
): () => void {
  /*
   * Registered shortcut command policy:
   *
   * - use high priority before the default list plugin mutates plain list text;
   * - handle only structural list actions;
   * - return false whenever the focused child block should own the key;
   * - replay Markdown shortcuts through the shared transformer set after text
   *   updates inside list-item block containers.
   */
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
       * Fresh Markdown shortcuts create Lexical-native list items first. The
       * runtime transform immediately aligns them with the block-container
       * model used by imported Markdown:
       *
       * - inline text under ListItemNode becomes a paragraph child;
       * - empty items receive an editable paragraph;
       * - a collapsed cursor on the list item moves into that paragraph;
       * - existing structured children are left untouched.
       */
      const selection = $getSelection();
      normalizeListItemForEditing(listItem, $isRangeSelection(selection) ? selection : null);
    }),
    editor.registerUpdateListener(({ dirtyLeaves, editorState, tags }) => {
      if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG) || dirtyLeaves.size === 0) {
        return;
      }

      const pending = editorState.read(() => readPendingShortcutSelection(dirtyLeaves));
      if (!pending) {
        return;
      }

      editor.update(() => {
        if (restoreShortcutSelection(pending)) {
          applyListContainerMarkdownShortcutAtSelection(transformers);
        }
      });
    }),
  );
}
