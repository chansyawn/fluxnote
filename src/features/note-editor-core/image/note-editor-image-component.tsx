import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { i18n } from "@lingui/core";
import {
  $getNodeByKey,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  mergeRegister,
  type NodeKey,
} from "lexical";
import { useEffect, useState } from "react";

import { $moveCaretAfterImage, $moveCaretBeforeImage } from "./note-editor-image-cursor";
import { $isNoteEditorImageNode } from "./note-editor-image-node";
import {
  isInternalAssetUrl,
  resolveAssetUrl,
  warmImageDataUrlCache,
} from "./note-editor-image-utils";

interface NoteEditorImageComponentProps {
  altText: string;
  blockId: string;
  nodeKey: NodeKey;
  src: string;
}

export function NoteEditorImageComponent({
  altText,
  blockId,
  nodeKey,
  src,
}: NoteEditorImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    warmImageDataUrlCache(src, blockId);

    void (async () => {
      try {
        const nextResolvedSrc = await resolveAssetUrl(src, blockId);

        if (!cancelled) {
          setResolvedSrc(nextResolvedSrc);
          setHasError(false);
        }
      } catch (error) {
        console.error("Failed to resolve image asset", error);
        if (!cancelled) {
          setHasError(true);
          setResolvedSrc(src);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blockId, src]);

  useEffect(() => {
    /**
     * Handles keyboard commands when image is selected.
     *
     * Interaction rules:
     * - Delete/Backspace → remove the image
     * - ↑/← → move cursor before the image (creates paragraph if needed)
     * - ↓/→ → move cursor after the image (creates paragraph if needed)
     * - Enter → insert new line after the image
     */
    const handleImageCommand = (
      action: "remove" | "moveAfter" | "moveBefore",
      event: KeyboardEvent | null,
    ) => {
      if (!isSelected) {
        return false;
      }

      if (event) {
        event.preventDefault();
      }

      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isNoteEditorImageNode(node)) {
          return;
        }

        if (action === "remove") {
          node.remove();
          $setSelection(null);
        } else if (action === "moveAfter") {
          $moveCaretAfterImage(node);
        } else {
          $moveCaretBeforeImage(node);
        }
      });

      return true;
    };

    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return false;
          }

          if (!target.closest(`[data-note-editor-image-key="${nodeKey}"]`)) {
            return false;
          }

          if (event.shiftKey) {
            setSelected(!isSelected);
          } else {
            clearSelected();
            setSelected(true);
          }

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        (event) => handleImageCommand("remove", event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => handleImageCommand("remove", event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => handleImageCommand("moveAfter", event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        (event) => handleImageCommand("moveAfter", event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => handleImageCommand("moveBefore", event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        (event) => handleImageCommand("moveBefore", event),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => handleImageCommand("moveAfter", event),
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelected, editor, isSelected, nodeKey, setSelected]);

  if (hasError) {
    return (
      <span
        className="note-block-editor__image note-block-editor__image--error"
        data-note-editor-image-key={nodeKey}
      >
        {i18n._({
          id: "editor.image.load-error",
          message: "Image unavailable",
        })}
      </span>
    );
  }

  if (!resolvedSrc) {
    return null;
  }

  return (
    <span
      className="note-block-editor__image-shell"
      data-note-editor-image-key={nodeKey}
      data-selected={isSelected ? "true" : undefined}
      data-source={isInternalAssetUrl(src) ? "internal" : "external"}
      role="button"
      tabIndex={0}
    >
      <img alt={altText} className="note-block-editor__image" draggable={false} src={resolvedSrc} />
    </span>
  );
}
