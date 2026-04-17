import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { i18n } from "@lingui/core";
import {
  $getNodeByKey,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  mergeRegister,
  type NodeKey,
} from "lexical";
import { useEffect, useState } from "react";

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
        (event) => {
          return removeSelectedImageNode(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          return removeSelectedImageNode(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelected, editor, isSelected, nodeKey, setSelected]);

  const removeSelectedImageNode = (event: KeyboardEvent) => {
    if (!isSelected) {
      return false;
    }

    event.preventDefault();
    editor.update(() => {
      $getNodeByKey(nodeKey)?.remove();
      $setSelection(null);
    });

    return true;
  };

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
