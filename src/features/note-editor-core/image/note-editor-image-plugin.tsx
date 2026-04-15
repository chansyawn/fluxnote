import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { i18n } from "@lingui/core";
import { COMMAND_PRIORITY_HIGH, $insertNodes, DROP_COMMAND, PASTE_COMMAND } from "lexical";
import { useEffect } from "react";
import { toast } from "sonner";

import {
  $createNoteEditorImageNode,
  $isNoteEditorImageNode,
  NoteEditorImageNode,
} from "./note-editor-image-node";
import { createAssetFromFile, isSupportedImageFile } from "./note-editor-image-utils";

interface NoteEditorImagePluginProps {
  blockId: string;
}

export function NoteEditorImagePlugin({ blockId }: NoteEditorImagePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const insertImagesFromFiles = async (files: File[]) => {
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
    };

    return editor.registerCommand<ClipboardEvent>(
      PASTE_COMMAND,
      (event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(isSupportedImageFile);
        if (files.length === 0) {
          return false;
        }

        event.preventDefault();
        void insertImagesFromFiles(files);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [blockId, editor]);

  useEffect(() => {
    const insertImagesFromFiles = async (files: File[]) => {
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
    };

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
  }, [blockId, editor]);

  useEffect(() => {
    return editor.registerNodeTransform(NoteEditorImageNode, (node) => {
      if ($isNoteEditorImageNode(node) && node.getBlockId() !== blockId) {
        node.setBlockId(blockId);
      }
    });
  }, [blockId, editor]);

  return null;
}
