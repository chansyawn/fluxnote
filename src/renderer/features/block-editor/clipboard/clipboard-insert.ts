import {
  $generateNodesFromSerializedNodes,
  $insertDataTransferForRichText,
} from "@lexical/clipboard";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
} from "lexical";

import { createNodesForTargetBlock } from "./clipboard-assets";
import type { BlockEditorClipboardPayload, ClipboardSerializedNode } from "./clipboard-payload";

interface RichTextClipboardData {
  getData(type: string): string;
}

export function cloneCurrentSelection(): BaseSelection | null {
  return $getSelection()?.clone() ?? null;
}

export function insertSerializedNodesAtSelection(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
): void {
  const lexicalNodes = $generateNodesFromSerializedNodes([...nodes]);
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    selection.insertNodes(lexicalNodes);
    return;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(...lexicalNodes);
  $getRoot().append(paragraph);
  paragraph.selectEnd();
}

export function insertRichTextDataAtSelection(
  editor: LexicalEditor,
  dataTransfer: RichTextClipboardData,
  selection: BaseSelection | null,
): void {
  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      const currentSelection = $getSelection();
      if (currentSelection) {
        // Lexical's rich text insertion path only reads getData(), so paste snapshots can survive async boundaries.
        $insertDataTransferForRichText(dataTransfer as DataTransfer, currentSelection, editor);
      }
    },
    { discrete: true },
  );
}

export async function insertClipboardPayloadAtSelection(
  editor: LexicalEditor,
  targetBlockId: string,
  payload: BlockEditorClipboardPayload,
  selection: BaseSelection | null,
): Promise<void> {
  const nodes = await createNodesForTargetBlock(payload, targetBlockId);

  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      insertSerializedNodesAtSelection(nodes);
    },
    { discrete: true },
  );
}
