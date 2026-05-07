import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
} from "lexical";

import { createImagePayloadsFromFiles } from "../assets/image-files";
import { $createImageNode, type ImagePayload } from "../syntax/image/image-node";

function insertImagePayloadsAtSelection(payloads: ReadonlyArray<ImagePayload>): boolean {
  if (payloads.length === 0) {
    return false;
  }

  const imageNodes = payloads.map((payload) => $createImageNode(payload));
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    selection.insertNodes(imageNodes);
    return true;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(...imageNodes);
  $getRoot().append(paragraph);
  paragraph.selectEnd();
  return true;
}

async function createImagePayloads(
  blockId: string,
  files: ReadonlyArray<File>,
): Promise<ImagePayload[]> {
  try {
    return await createImagePayloadsFromFiles({ blockId, files });
  } catch (error) {
    console.error("Failed to create image assets.", error);
    return [];
  }
}

export async function insertImageFilesAtSelection(
  editor: LexicalEditor,
  blockId: string,
  files: ReadonlyArray<File>,
  selection: BaseSelection | null,
): Promise<void> {
  const payloads = await createImagePayloads(blockId, files);
  if (payloads.length === 0) {
    return;
  }

  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      insertImagePayloadsAtSelection(payloads);
    },
    { discrete: true },
  );
}
