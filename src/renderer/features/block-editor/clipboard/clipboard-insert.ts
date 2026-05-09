import {
  $generateNodesFromSerializedNodes,
  $insertDataTransferForRichText,
} from "@lexical/clipboard";
import {
  type BlockEditorClipboardPayload,
  type ClipboardSerializedNode,
} from "@shared/features/block-editor/clipboard";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
} from "lexical";

import type { BlockEditorRuntime } from "../core/types";
import { createNodesForTargetBlock } from "./clipboard-assets";

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

  if ($isNodeSelection(selection)) {
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
  runtime: BlockEditorRuntime,
  payload: BlockEditorClipboardPayload,
  selection: BaseSelection | null,
): Promise<void> {
  const nodes = await createNodesForTargetBlock(payload, runtime.assets.copy);

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
