import {
  $generateNodesFromSerializedNodes,
  $insertDataTransferForRichText,
} from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { copyAsset } from "@renderer/clients";
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
  type SerializedLexicalNode,
} from "lexical";
import { useEffect } from "react";

import {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  parseBlockEditorClipboardPayload,
  type BlockEditorClipboardPayload,
} from "../../clipboard/clipboard-payload";
import {
  createImagePayloadsFromFiles,
  getSupportedImageFiles,
  hasSupportedImageData,
} from "./image-file";
import { $createImageNode, type ImagePayload } from "./image-node";

interface ImageInsertPluginProps {
  blockId: string;
}

function getClipboardData(event: PasteCommandType): DataTransfer | null {
  return "clipboardData" in event ? event.clipboardData : null;
}

function cloneCurrentSelection(): BaseSelection | null {
  return $getSelection()?.clone() ?? null;
}

async function readInternalClipboardPayload(): Promise<BlockEditorClipboardPayload | null> {
  const result = await window.clipboard?.read();
  const value = result?.data?.[BLOCK_EDITOR_CLIPBOARD_MIME];
  return value ? parseBlockEditorClipboardPayload(value) : null;
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

type ClipboardSerializedNode = SerializedLexicalNode &
  Record<string, unknown> & {
    children?: ClipboardSerializedNode[];
    src?: unknown;
  };

export function rewriteImageNodeUrls(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
  assetUrlMap: Map<string, string>,
): ClipboardSerializedNode[] {
  return nodes.map((node) => {
    const nextNode: ClipboardSerializedNode = { ...node };
    if (node.type === "image" && typeof node.src === "string") {
      nextNode.src = assetUrlMap.get(node.src) ?? node.src;
    }

    if (node.children) {
      nextNode.children = rewriteImageNodeUrls(node.children, assetUrlMap);
    }

    return nextNode;
  });
}

function insertSerializedNodesAtSelection(nodes: ReadonlyArray<ClipboardSerializedNode>): void {
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

function insertRichTextDataAtSelection(
  editor: LexicalEditor,
  dataTransfer: DataTransfer,
  selection: BaseSelection | null,
): void {
  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      const currentSelection = $getSelection();
      if (currentSelection) {
        $insertDataTransferForRichText(dataTransfer, currentSelection, editor);
      }
    },
    { discrete: true },
  );
}

async function insertInternalClipboardPayload(
  editor: LexicalEditor,
  targetBlockId: string,
  payload: BlockEditorClipboardPayload,
  selection: BaseSelection | null,
): Promise<void> {
  const sourceAssetUrls = payload.assets.map((asset) => asset.assetUrl);
  const copiedAssets =
    sourceAssetUrls.length > 0
      ? await copyAsset({
          assetUrls: sourceAssetUrls,
          sourceBlockId: payload.sourceBlockId,
          targetBlockId,
        })
      : { assets: [] };
  const assetUrlMap = new Map(
    copiedAssets.assets.map((asset) => [asset.sourceAssetUrl, asset.assetUrl]),
  );
  const rewrittenNodes = rewriteImageNodeUrls(payload.nodes, assetUrlMap);

  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      insertSerializedNodesAtSelection(rewrittenNodes);
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
        const internalPayload = clipboardData
          ? parseBlockEditorClipboardPayload(clipboardData.getData(BLOCK_EDITOR_CLIPBOARD_MIME))
          : null;
        if (internalPayload) {
          event.preventDefault();
          event.stopPropagation();
          void insertInternalClipboardPayload(editor, blockId, internalPayload, selection);
          return true;
        }

        const files = getSupportedImageFiles(clipboardData);
        if (files.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          void insertImageFiles(editor, blockId, files, selection);
          return true;
        }

        if (!window.clipboard?.read || clipboardData === null) {
          return false;
        }

        event.preventDefault();
        event.stopPropagation();
        void readInternalClipboardPayload().then((payload) => {
          if (payload !== null) {
            void insertInternalClipboardPayload(editor, blockId, payload, selection);
            return;
          }

          insertRichTextDataAtSelection(editor, clipboardData, selection);
        });
        return true;
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
