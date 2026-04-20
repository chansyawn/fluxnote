import { $generateNodesFromSerializedNodes } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { i18n } from "@lingui/core";
import {
  $insertNodes,
  $isElementNode,
  $createNodeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  DROP_COMMAND,
  PASTE_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type SerializedLexicalNode,
} from "lexical";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { copyAsset } from "@/clients";
import { useNoteEditorBlockId } from "@/features/note-editor-core/composer/note-editor-block-context";

import {
  $createNoteEditorImageNode,
  $isNoteEditorImageNode,
  NoteEditorImageNode,
} from "./note-editor-image-node";
import {
  createAssetFromFile,
  isInternalAssetUrl,
  isSupportedImageFile,
} from "./note-editor-image-utils";

type SerializedClipboardNode = SerializedLexicalNode & {
  children?: SerializedClipboardNode[];
};

interface SerializedLexicalClipboardPayload {
  nodes: SerializedClipboardNode[];
}

export function NoteEditorImagePlugin() {
  const [editor] = useLexicalComposerContext();
  const blockId = useNoteEditorBlockId();

  const insertImagesFromFiles = useCallback(
    async (files: File[]) => {
      try {
        const imageFiles = files.filter(isSupportedImageFile);
        if (imageFiles.length === 0) {
          return;
        }

        const assets = await Promise.all(
          imageFiles.map((file) => createAssetFromFile(file, blockId)),
        );

        editor.update(() => {
          const imageNodes = assets.map((asset) =>
            $createNoteEditorImageNode({
              altText: asset.altText,
              blockId,
              src: asset.assetUrl,
            }),
          );

          $insertNodes(imageNodes);

          if (imageNodes.length === 1) {
            const nodeSelection = $createNodeSelection();
            nodeSelection.add(imageNodes[0].getKey());
            $setSelection(nodeSelection);
          }
        });
      } catch (error) {
        console.error("Failed to insert images", error);
        toast.error(
          i18n._({
            id: "editor.image.insert-error",
            message: "Failed to insert image",
          }),
        );
      }
    },
    [blockId, editor],
  );

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent>(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          return false;
        }

        const lexicalPayload = parseLexicalClipboardPayload(
          clipboardData.getData("application/x-lexical-editor"),
        );
        if (lexicalPayload && hasSerializedImageNodes(lexicalPayload.nodes)) {
          event.preventDefault();

          let pastedImageNodes: NoteEditorImageNode[] = [];
          editor.update(() => {
            const nodes = $generateNodesFromSerializedNodes(lexicalPayload.nodes);
            pastedImageNodes = collectImageNodes(nodes);

            $insertNodes(nodes);
          });
          void rehomePastedImageNodes(editor, pastedImageNodes, blockId);

          return true;
        }

        const files = Array.from(clipboardData.files).filter(isSupportedImageFile);
        if (files.length === 0) {
          return false;
        }

        event.preventDefault();
        void insertImagesFromFiles(files);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [blockId, editor, insertImagesFromFiles]);

  useEffect(() => {
    return editor.registerCommand<DragEvent>(
      DROP_COMMAND,
      (event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter(isSupportedImageFile);
        if (files.length === 0) {
          return false;
        }

        event.preventDefault();
        void insertImagesFromFiles(files);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, insertImagesFromFiles]);

  useEffect(() => {
    return editor.registerNodeTransform(NoteEditorImageNode, (node) => {
      if ($isNoteEditorImageNode(node) && !node.getBlockId()) {
        node.setBlockId(blockId);
      }
    });
  }, [blockId, editor]);

  return null;
}

function parseLexicalClipboardPayload(
  lexicalData: string,
): SerializedLexicalClipboardPayload | null {
  if (!lexicalData) {
    return null;
  }

  try {
    const parsed = JSON.parse(lexicalData) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const { nodes } = parsed as { nodes?: unknown };
    if (!Array.isArray(nodes)) {
      return null;
    }

    return {
      nodes: nodes as SerializedClipboardNode[],
    };
  } catch (error) {
    console.error("Failed to parse lexical data", error);
    return null;
  }
}

function hasSerializedImageNodes(nodes: readonly SerializedClipboardNode[]): boolean {
  return nodes.some(
    (node) =>
      node.type === "note-editor-image" ||
      (node.children ? hasSerializedImageNodes(node.children) : false),
  );
}

function collectImageNodes(nodes: readonly LexicalNode[]): NoteEditorImageNode[] {
  const imageNodes: NoteEditorImageNode[] = [];

  for (const node of nodes) {
    if ($isNoteEditorImageNode(node)) {
      imageNodes.push(node);
      continue;
    }

    if ($isElementNode(node)) {
      imageNodes.push(...collectImageNodes(node.getChildren()));
    }
  }

  return imageNodes;
}

async function rehomePastedImageNodes(
  editor: LexicalEditor,
  imageNodes: readonly NoteEditorImageNode[],
  targetBlockId: string,
): Promise<void> {
  const externalImages = imageNodes.filter(
    (node) =>
      node.getBlockId() &&
      node.getBlockId() !== targetBlockId &&
      !isInternalAssetUrl(node.getSrc()),
  );

  if (externalImages.length > 0) {
    editor.update(() => {
      for (const imageNode of externalImages) {
        imageNode.setBlockId(targetBlockId);
      }
    });
  }

  const internalImages = imageNodes.filter(
    (node) =>
      node.getBlockId() && node.getBlockId() !== targetBlockId && isInternalAssetUrl(node.getSrc()),
  );

  await Promise.allSettled(
    internalImages.map(async (imageNode) => {
      try {
        const { assetUrl } = await copyAsset({
          assetUrl: imageNode.getSrc(),
          sourceBlockId: imageNode.getBlockId(),
          targetBlockId,
        });

        editor.update(() => {
          const writable = imageNode.getWritable();
          writable.__src = assetUrl;
          writable.__blockId = targetBlockId;
        });
      } catch (error) {
        console.error("Failed to copy asset", error);
      }
    }),
  );
}
