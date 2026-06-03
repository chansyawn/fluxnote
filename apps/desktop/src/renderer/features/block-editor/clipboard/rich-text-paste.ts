import { $insertDataTransferForRichText } from "@lexical/clipboard";
import { withDOM } from "@lexical/headless/dom";
import {
  $getRoot,
  $getSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
} from "lexical";

interface RichTextClipboardData {
  getData(type: string): string;
}

export function cloneCurrentSelection(): BaseSelection | null {
  return $getSelection()?.clone() ?? null;
}

function restoreSelection(selection: BaseSelection | null): void {
  if (selection) {
    $setSelection(selection.clone());
  }
}

export function insertRichTextDataAtSelection(
  editor: LexicalEditor,
  dataTransfer: RichTextClipboardData,
  selection: BaseSelection | null,
): void {
  withDOM(() => {
    editor.update(
      () => {
        restoreSelection(selection);

        let currentSelection = $getSelection();
        if (!currentSelection) {
          $getRoot().selectEnd();
          currentSelection = $getSelection();
        }

        if (currentSelection) {
          // Lexical's rich text insertion path only reads getData(), so paste snapshots can survive async boundaries.
          $insertDataTransferForRichText(dataTransfer as DataTransfer, currentSelection, editor);
        }
      },
      { discrete: true },
    );
  });
}
