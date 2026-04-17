import { $generateNodesFromSerializedNodes } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { i18n } from "@lingui/core";
import { $insertNodes, COMMAND_PRIORITY_HIGH, DROP_COMMAND, PASTE_COMMAND } from "lexical";
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
          $insertNodes(
            assets.map((asset) =>
              $createNoteEditorImageNode({
                altText: asset.altText,
                blockId,
                src: asset.assetUrl,
              }),
            ),
          );
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

        const lexicalData = clipboardData.getData("application/x-lexical-editor");
        if (lexicalData) {
          try {
            const parsed = JSON.parse(lexicalData);

            const hasImageNodes = JSON.stringify(parsed).includes('"type":"note-editor-image"');
            if (hasImageNodes) {
              event.preventDefault();

              editor.update(() => {
                const nodes = $generateNodesFromSerializedNodes(parsed.nodes);
                const imageNodes = nodes.filter($isNoteEditorImageNode);

                const crossBlockImages = imageNodes.filter(
                  (node) => node.getBlockId() && node.getBlockId() !== blockId,
                );

                if (crossBlockImages.length > 0) {
                  void (async () => {
                    for (const imageNode of crossBlockImages) {
                      if (isInternalAssetUrl(imageNode.getSrc())) {
                        try {
                          const { assetUrl } = await copyAsset({
                            assetUrl: imageNode.getSrc(),
                            sourceBlockId: imageNode.getBlockId(),
                            targetBlockId: blockId,
                          });

                          editor.update(() => {
                            const writable = imageNode.getWritable();
                            writable.__src = assetUrl;
                            writable.__blockId = blockId;
                          });
                        } catch (error) {
                          console.error("Failed to copy asset", error);
                        }
                      }
                    }
                  })();
                }

                $insertNodes(nodes);
              });

              return true;
            }
          } catch (error) {
            console.error("Failed to parse lexical data", error);
          }
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
