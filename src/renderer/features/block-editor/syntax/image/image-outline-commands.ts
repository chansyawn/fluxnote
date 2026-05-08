import {
  $getSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  type LexicalEditor,
  mergeRegister,
  type NodeKey,
} from "lexical";

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

export function registerImageOutlineCommands(editor: LexicalEditor): () => void {
  let outlineState = HIDDEN_IMAGE_OUTLINE_STATE;
  let visibleImageKey: NodeKey | null = null;

  const updateOutline = (nextState: Partial<ImageOutlineState>) => {
    outlineState = { ...outlineState, ...nextState };

    const nextImageKey = shouldShowImageOutlineForState(outlineState)
      ? outlineState.selectedImageKey
      : null;
    setImageOutlineClass(editor, visibleImageKey, nextImageKey);
    visibleImageKey = nextImageKey;
  };

  const rootElement = editor.getRootElement();
  const startPointerSelection = () => {
    updateOutline({ isPointerSelecting: true });
  };
  const stopPointerSelection = () => {
    updateOutline({ isPointerSelecting: false });
  };

  const unregisterRootEvents = rootElement
    ? () => {
        rootElement.removeEventListener("pointerdown", startPointerSelection);
        rootElement.ownerDocument.removeEventListener("pointerup", stopPointerSelection);
        rootElement.ownerDocument.removeEventListener("pointercancel", stopPointerSelection);
      }
    : () => {};

  if (rootElement) {
    rootElement.addEventListener("pointerdown", startPointerSelection);
    rootElement.ownerDocument.addEventListener("pointerup", stopPointerSelection);
    rootElement.ownerDocument.addEventListener("pointercancel", stopPointerSelection);
  }

  const unregisterEditor = mergeRegister(
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

  return () => {
    unregisterRootEvents();
    unregisterEditor();
    setImageOutlineClass(editor, visibleImageKey, null);
  };
}
