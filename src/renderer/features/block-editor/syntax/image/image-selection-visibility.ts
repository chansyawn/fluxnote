import { $isNodeSelection, type BaseSelection, type NodeKey } from "lexical";

import { $isImageNode } from "./image-node";

export interface ImageOutlineState {
  editorHasFocus: boolean;
  isPointerSelecting: boolean;
  selectedImageKey: NodeKey | null;
}

export const HIDDEN_IMAGE_OUTLINE_STATE: ImageOutlineState = {
  editorHasFocus: false,
  isPointerSelecting: false,
  selectedImageKey: null,
};

export function getSingleSelectedImageKey(selection: BaseSelection | null): NodeKey | null {
  if (!$isNodeSelection(selection)) {
    return null;
  }

  const nodes = selection.getNodes();
  if (nodes.length !== 1) {
    return null;
  }

  const [node] = nodes;
  return $isImageNode(node) ? node.getKey() : null;
}

export function shouldShowImageOutline(nodeKey: NodeKey, state: ImageOutlineState): boolean {
  return shouldShowImageOutlineForState(state) && state.selectedImageKey === nodeKey;
}

export function shouldShowImageOutlineForState(state: ImageOutlineState): boolean {
  return state.editorHasFocus && !state.isPointerSelecting && state.selectedImageKey !== null;
}
