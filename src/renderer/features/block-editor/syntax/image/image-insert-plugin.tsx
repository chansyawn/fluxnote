import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  PASTE_COMMAND,
  type BaseSelection,
  type LexicalEditor,
  type PasteCommandType,
} from "lexical";
import { useEffect } from "react";

import {
  createImagePayloadsFromFiles,
  getSupportedImageFiles,
  hasSupportedImageData,
} from "../../assets/image-files";
import { cloneCurrentSelection } from "../../clipboard/clipboard-insert";
import { $createImageNode, type ImagePayload } from "./image-node";

interface ImageInsertPluginProps {
  blockId: string;
}

function getClipboardData(event: PasteCommandType): DataTransfer | null {
  return "clipboardData" in event ? event.clipboardData : null;
}

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

async function insertImageFiles(
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

export function registerImageInsertCommands(editor: LexicalEditor, blockId: string): () => void {
  return mergeRegister(
    editor.registerCommand(
      DRAGOVER_COMMAND,
      (event) => {
        if (!hasSupportedImageData(event.dataTransfer)) {
          return false;
        }

        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        const files = getSupportedImageFiles(event.dataTransfer);
        if (files.length === 0) {
          return false;
        }

        const selection = cloneCurrentSelection();
        event.preventDefault();
        event.stopPropagation();
        void insertImageFiles(editor, blockId, files, selection);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = getClipboardData(event);
        const selection = cloneCurrentSelection();
        const files = getSupportedImageFiles(clipboardData);
        if (files.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          void insertImageFiles(editor, blockId, files, selection);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
  );
}

export function ImageInsertPlugin({ blockId }: ImageInsertPluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => registerImageInsertCommands(editor, blockId), [blockId, editor]);

  return null;
}
