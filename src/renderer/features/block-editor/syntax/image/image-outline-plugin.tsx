import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  type LexicalEditor,
  mergeRegister,
  type NodeKey,
} from "lexical";
import { useCallback, useEffect, useRef } from "react";

import {
  getSingleSelectedImageKey,
  HIDDEN_IMAGE_OUTLINE_STATE,
  shouldShowImageOutlineForState,
  type ImageOutlineState,
} from "./image-selection-visibility";

export const IMAGE_SELECTED_CLASS = "block-editor__image-shell--selected";

export function setImageOutlineClass(
  editor: LexicalEditor,
  previousImageKey: NodeKey | null,
  nextImageKey: NodeKey | null,
): void {
  if (previousImageKey === nextImageKey) {
    return;
  }

  if (previousImageKey) {
    editor.getElementByKey(previousImageKey)?.classList.remove(IMAGE_SELECTED_CLASS);
  }

  if (nextImageKey) {
    editor.getElementByKey(nextImageKey)?.classList.add(IMAGE_SELECTED_CLASS);
  }
}

export function ImageOutlinePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const outlineStateRef = useRef<ImageOutlineState>(HIDDEN_IMAGE_OUTLINE_STATE);
  const visibleImageKeyRef = useRef<NodeKey | null>(null);

  const updateOutline = useCallback(
    (nextState: Partial<ImageOutlineState>) => {
      const state = { ...outlineStateRef.current, ...nextState };
      outlineStateRef.current = state;

      const nextImageKey = shouldShowImageOutlineForState(state) ? state.selectedImageKey : null;
      setImageOutlineClass(editor, visibleImageKeyRef.current, nextImageKey);
      visibleImageKeyRef.current = nextImageKey;
    },
    [editor],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateOutline({ selectedImageKey: getSingleSelectedImageKey($getSelection()) });
        });
      }),
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          updateOutline({ editorHasFocus: true });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          updateOutline({ editorHasFocus: false, isPointerSelecting: false });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateOutline]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) {
      return undefined;
    }

    const startPointerSelection = () => {
      updateOutline({ isPointerSelecting: true });
    };
    const stopPointerSelection = () => {
      updateOutline({ isPointerSelecting: false });
    };

    rootElement.addEventListener("pointerdown", startPointerSelection);
    rootElement.ownerDocument.addEventListener("pointerup", stopPointerSelection);
    rootElement.ownerDocument.addEventListener("pointercancel", stopPointerSelection);

    return () => {
      rootElement.removeEventListener("pointerdown", startPointerSelection);
      rootElement.ownerDocument.removeEventListener("pointerup", stopPointerSelection);
      rootElement.ownerDocument.removeEventListener("pointercancel", stopPointerSelection);
    };
  }, [editor, updateOutline]);

  useEffect(() => {
    return () => {
      setImageOutlineClass(editor, visibleImageKeyRef.current, null);
    };
  }, [editor]);

  return null;
}
