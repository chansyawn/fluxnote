import { $isCodeNode } from "@lexical/code";
import { $isListItemNode, ListItemNode } from "@lexical/list";
import {
  CHECK_LIST,
  type ElementTransformer,
  type MultilineElementTransformer,
  type Transformer,
} from "@lexical/markdown";
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_HIGH,
  HISTORIC_TAG,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  type ElementNode,
  type LexicalEditor,
  type NodeKey,
  type RangeSelection,
  type TextNode,
} from "lexical";

import {
  getCurrentListItem,
  getCurrentListItemBlock,
  getSelectedListItems,
} from "./list-selection";
import {
  collapseStructuredBlockAtStart,
  ensureListItemHasParagraph,
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
  wrapListItemInlineChildrenInParagraphs,
} from "./list-structure";

interface ShortcutContext {
  anchorNode: TextNode;
  anchorOffset: number;
  parentNode: ElementNode;
}

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

function isElementTransformer(transformer: Transformer): transformer is ElementTransformer {
  return transformer.type === "element";
}

function isMultilineElementTransformer(
  transformer: Transformer,
): transformer is MultilineElementTransformer {
  return transformer.type === "multiline-element";
}

function getTransformerParent(anchorNode: TextNode): ElementNode | null {
  let parent = anchorNode.getParent();
  if ($isListItemNode(parent)) {
    /*
     * Lexical list items can temporarily hold inline children when users type
     * directly after the marker. The semantic model expects block children, so
     * normalize inline runs into a paragraph before running block transformers.
     */
    wrapListItemInlineChildrenInParagraphs(parent);
    parent = anchorNode.getParent();
  }

  if (!$isElementNode(parent) || $isCodeNode(parent)) {
    return null;
  }

  return parent;
}

function getShortcutContext(selection: RangeSelection): ShortcutContext | null {
  /*
   * Markdown shortcuts should only run for a collapsed cursor at the start of a
   * text-bearing block inside a list item. This mirrors Lexical's root shortcut
   * behavior and prevents shortcuts from firing in the middle of existing text,
   * inline code, or nested structured nodes that own their own parsing rules.
   */
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode) || anchorNode.hasFormat("code")) {
    return null;
  }

  const parentNode = getTransformerParent(anchorNode);
  if (!parentNode || parentNode.getFirstChild() !== anchorNode) {
    return null;
  }

  if (!getCurrentListItem(selection)) {
    return null;
  }

  return {
    anchorNode,
    anchorOffset: selection.anchor.offset,
    parentNode,
  };
}

function isBareTaskMarkerShortcut(textContent: string, anchorOffset: number): boolean {
  /*
   * CHECK_LIST is intentionally skipped for the bare task marker here because
   * TaskListShortcutPlugin owns [] / [x] conversion. Keeping that behavior in
   * one place avoids double conversion and preserves the existing root/list
   * shortcut semantics.
   */
  return /^\s?\[[ x]?\]\s$/i.test(textContent.slice(0, anchorOffset));
}

function runElementTransformers(
  context: ShortcutContext,
  transformers: ReadonlyArray<ElementTransformer>,
): boolean {
  const { anchorNode, anchorOffset, parentNode } = context;
  const textContent = anchorNode.getTextContent();
  if (textContent[anchorOffset - 1] !== " ") {
    return false;
  }

  for (const transformer of transformers) {
    const match = textContent.match(transformer.regExp);
    if (!match) {
      continue;
    }

    if (transformer === CHECK_LIST && isBareTaskMarkerShortcut(textContent, anchorOffset)) {
      continue;
    }

    const matchLength = match[0].endsWith(" ") ? anchorOffset : anchorOffset - 1;
    if (match[0].length !== matchLength) {
      continue;
    }

    const nextSiblings = anchorNode.getNextSiblings();
    const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
    const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
    /*
     * Transformer replacement receives the normalized block parent plus the
     * remaining inline siblings. This is the same data shape Lexical's Markdown
     * plugin expects at the root level, which lets headings, quotes and nested
     * lists work inside list-item containers without duplicating parser logic.
     */
    if (transformer.replace(parentNode, siblings, match, false) !== false) {
      leadingNode.remove();
      return true;
    }
  }

  return false;
}

function runMultilineElementTransformers(
  context: ShortcutContext,
  transformers: ReadonlyArray<MultilineElementTransformer>,
  triggerOnEnter: boolean,
): boolean {
  const { anchorNode, anchorOffset, parentNode } = context;
  const textContent = anchorNode.getTextContent();
  if (!triggerOnEnter && textContent[anchorOffset - 1] !== " ") {
    return false;
  }

  for (const transformer of transformers) {
    const { regExpEnd, regExpStart, replace } = transformer;
    if (regExpEnd && (!("optional" in regExpEnd) || !regExpEnd.optional)) {
      continue;
    }

    const match = textContent.match(regExpStart);
    if (!match) {
      continue;
    }

    const matchLength = triggerOnEnter || match[0].endsWith(" ") ? anchorOffset : anchorOffset - 1;
    if (match[0].length !== matchLength) {
      continue;
    }

    const nextSiblings = anchorNode.getNextSiblings();
    const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
    const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
    /*
     * Multiline shortcuts such as fenced code can be triggered by the normal
     * trailing space path or by Enter. Only optional-end transformers are handled
     * here, because non-optional multiline parsing needs a complete range and is
     * better left to the standard Markdown import/export pipeline.
     */
    if (replace(parentNode, siblings, match, null, null, false) !== false) {
      leadingNode.remove();
      return true;
    }
  }

  return false;
}

export function applyListContainerMarkdownShortcutAtSelection(
  transformers: ReadonlyArray<Transformer>,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const context = getShortcutContext(selection);
  if (!context) {
    return false;
  }

  return (
    runElementTransformers(context, transformers.filter(isElementTransformer)) ||
    runMultilineElementTransformers(
      context,
      transformers.filter(isMultilineElementTransformer),
      false,
    )
  );
}

function applyListContainerMultilineShortcutAtSelection(
  selection: RangeSelection,
  transformers: ReadonlyArray<Transformer>,
): boolean {
  const context = getShortcutContext(selection);
  if (!context) {
    return false;
  }

  return runMultilineElementTransformers(
    context,
    transformers.filter(isMultilineElementTransformer),
    true,
  );
}

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
   * - non-final paragraph in a multi-block item: return false so paragraph
   *   editing stays inside the current list item.
   */
  if (isSingleParagraphListItem(listItem) || isCursorAtLastParagraphEnd(selection, listItem)) {
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

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode) || !dirtyLeaves.has(anchorNode.getKey())) {
    return null;
  }

  return {
    anchorKey: anchorNode.getKey(),
    anchorOffset: selection.anchor.offset,
  };
}

function restoreShortcutSelection({ anchorKey, anchorOffset }: PendingShortcutSelection): boolean {
  const node = $getNodeByKey(anchorKey);
  if (!$isTextNode(node)) {
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
