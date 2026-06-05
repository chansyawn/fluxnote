import type { BlockEditorCodeBlockConfig } from "../../core/types";

export interface CodeBlockOverlayRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface ElementRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface ScrollOffset {
  left: number;
  top: number;
}

export function calculateCodeToolbarRect(
  shellRect: ElementRect,
  codeRect: ElementRect,
  scrollOffset: ScrollOffset,
): CodeBlockOverlayRect {
  return {
    height: codeRect.height,
    left: codeRect.left - shellRect.left + scrollOffset.left,
    top: codeRect.top - shellRect.top + scrollOffset.top,
    width: codeRect.width,
  };
}

export function applyCodeBlockDisplayConfig(
  element: HTMLElement,
  codeBlockConfig: BlockEditorCodeBlockConfig,
): void {
  element.classList.toggle("block-editor__code--line-numbers", codeBlockConfig.showLineNumbers);
}
