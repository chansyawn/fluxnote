import type { Transformer } from "@lexical/markdown";
import { QuoteNode } from "@lexical/rich-text";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  mergeRegister,
  type LexicalEditor,
  type RangeSelection,
} from "lexical";

import { registerContainerShortcutReplay } from "../container/keyboard";
import { getCurrentQuote } from "./quote-selection";
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
    registerContainerShortcutReplay(editor, () =>
      applyQuoteContainerMarkdownShortcutAtSelection(transformers),
    ),
  );
}
