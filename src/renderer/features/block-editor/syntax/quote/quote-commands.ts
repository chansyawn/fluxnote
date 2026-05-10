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
  applyAltEnterAtQuoteSelection,
  collapseQuoteChildAtStart,
  exitQuoteAtEmptyParagraph,
  normalizeQuoteForEditing,
  unwrapQuoteAtStart,
} from "./quote-structure";

/*
 * Quote keyboard commands only own quote-level exits and unwraps. Returning false
 * deliberately leaves soft breaks, child block editing, and Lexical defaults in
 * control of the active editing context.
 */

function getSelectionFromCommand(): RangeSelection | null {
  const selection = $getSelection();
  return $isRangeSelection(selection) && selection.isCollapsed() ? selection : null;
}

/*
 * Enter key policy, in priority order:
 * - Shift+Enter belongs to soft-break handling;
 * - multiline Markdown shortcuts run before quote exits;
 * - Alt+Enter exits or splits the quote at the current quote boundary;
 * - an empty final paragraph exits the quote;
 * - all other positions stay owned by the active child block.
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

  const quote = getCurrentQuote(selection);
  if (!quote) {
    return false;
  }

  normalizeQuoteForEditing(quote, selection);

  if (applyQuoteContainerMultilineShortcutAtSelection(selection, transformers)) {
    event?.preventDefault();
    return true;
  }

  if (event?.altKey) {
    event.preventDefault();
    return applyAltEnterAtQuoteSelection(quote, selection);
  }

  if (exitQuoteAtEmptyParagraph(quote, selection)) {
    event?.preventDefault();
    return true;
  }

  return false;
}

/*
 * Backspace only owns quote structure at safe boundaries:
 * - structured child starts collapse/exit that child first;
 * - the start of the first quote child unwraps the quote;
 * - all other positions delegate to normal text/block editing.
 */
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

/*
 * Register before Lexical's default rich-text commands so FluxNote can preserve
 * block-container quote behavior, while still replaying Markdown shortcuts after
 * text updates inside quotes.
 */
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
      /*
       * Keep Lexical-created quotes aligned with imported Markdown quotes:
       * empty quotes become editable and collapsed selection moves into a child.
       */
      const selection = $getSelection();
      normalizeQuoteForEditing(quote, $isRangeSelection(selection) ? selection : null);
    }),
    registerContainerShortcutReplay(editor, () =>
      applyQuoteContainerMarkdownShortcutAtSelection(transformers),
    ),
  );
}
