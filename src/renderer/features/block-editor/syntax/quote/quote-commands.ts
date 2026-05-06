import type { Transformer } from "@lexical/markdown";
import { QuoteNode } from "@lexical/rich-text";
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
  mergeRegister,
  type LexicalEditor,
  type NodeKey,
  type RangeSelection,
} from "lexical";

import { getCurrentQuote, getSelectionAnchorNode } from "./quote-selection";
import {
  applyQuoteContainerMarkdownShortcutAtSelection,
  applyQuoteContainerMultilineShortcutAtSelection,
} from "./quote-shortcuts";
import {
  collapseQuoteChildAtStart,
  exitQuoteAtEmptyParagraph,
  normalizeQuoteForEditing,
  unwrapQuoteAtStart,
} from "./quote-structure";

function getSelectionFromCommand(): RangeSelection | null {
  const selection = $getSelection();
  return $isRangeSelection(selection) && selection.isCollapsed() ? selection : null;
}

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

  const quote = getCurrentQuote(selection);
  if (!quote) {
    return false;
  }

  normalizeQuoteForEditing(quote, selection);

  if (applyQuoteContainerMultilineShortcutAtSelection(selection, transformers)) {
    event?.preventDefault();
    return true;
  }

  if (exitQuoteAtEmptyParagraph(quote, selection)) {
    event?.preventDefault();
    return true;
  }

  return false;
}

function handleBackspace(event: KeyboardEvent): boolean {
  const selection = getSelectionFromCommand();
  if (!selection) {
    return false;
  }

  const quote = getCurrentQuote(selection);
  if (!quote) {
    return false;
  }

  normalizeQuoteForEditing(quote, selection);
  if (collapseQuoteChildAtStart(selection, quote)) {
    event.preventDefault();
    return true;
  }

  if (!unwrapQuoteAtStart(selection, quote)) {
    return false;
  }

  event.preventDefault();
  return true;
}

interface PendingShortcutSelection {
  anchorKey: NodeKey;
  anchorOffset: number;
}

function readPendingShortcutSelection(
  dirtyLeaves: ReadonlySet<NodeKey>,
): PendingShortcutSelection | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchorNode = getSelectionAnchorNode(selection);
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

export function registerQuoteKeyboardCommands(
  editor: LexicalEditor,
  transformers: ReadonlyArray<Transformer>,
): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => handleEnter(event, transformers),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(KEY_BACKSPACE_COMMAND, handleBackspace, COMMAND_PRIORITY_HIGH),
    editor.registerNodeTransform(QuoteNode, (quote) => {
      const selection = $getSelection();
      normalizeQuoteForEditing(quote, $isRangeSelection(selection) ? selection : null);
    }),
    editor.registerUpdateListener(({ dirtyLeaves, editorState, tags }) => {
      if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG) || dirtyLeaves.size === 0) {
        return;
      }

      const pending = editorState.read(() => readPendingShortcutSelection(dirtyLeaves));
      if (!pending) {
        return;
      }

      editor.update(
        () => {
          if (restoreShortcutSelection(pending)) {
            applyQuoteContainerMarkdownShortcutAtSelection(transformers);
          }
        },
        { discrete: true },
      );
    }),
  );
}
