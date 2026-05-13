import type { BlockEditorCodeBlockConfig } from "@renderer/features/block-editor/core/types";

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

export interface CodeBlockLineNumberViewState {
  number: number;
  top: number;
}

export interface CodeBlockLineNumberGutterViewState {
  height: number;
  left: number;
  lineHeight: string;
  top: number;
  width: number;
}

export interface CodeBlockLineNumberDisplayState {
  gutter: CodeBlockLineNumberGutterViewState;
  lineNumbers: CodeBlockLineNumberViewState[];
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

function toCssPixels(value: string): number {
  const trimmedValue = value.trim();
  const parsedValue = Number.parseFloat(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  if (trimmedValue.endsWith("rem")) {
    const rootFontSize = toCssPixels(window.getComputedStyle(document.documentElement).fontSize);
    return parsedValue * (rootFontSize || 16);
  }

  return parsedValue;
}

function getCssPixels(computedStyle: CSSStyleDeclaration, propertyNames: string[]): number {
  for (const propertyName of propertyNames) {
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (propertyValue.trim() === "") {
      continue;
    }

    return toCssPixels(propertyValue);
  }

  return 0;
}

function getComputedLineHeight(computedStyle: CSSStyleDeclaration): number {
  const lineHeight = toCssPixels(computedStyle.lineHeight);
  if (lineHeight > 0) {
    return lineHeight;
  }

  return toCssPixels(computedStyle.fontSize) * 1.5;
}

function getCodeLines(text: string): string[] {
  return text.split("\n");
}

export function applyCodeBlockDisplayConfig(
  element: HTMLElement,
  codeBlockConfig: BlockEditorCodeBlockConfig,
): void {
  element.classList.toggle("block-editor__code--line-numbers", codeBlockConfig.showLineNumbers);
  element.classList.toggle("block-editor__code--word-wrap", codeBlockConfig.wordWrap);
}

function createCodeLineMeasureElement(
  element: HTMLElement,
  computedStyle: CSSStyleDeclaration,
): HTMLDivElement {
  const paddingInlineStart = getCssPixels(computedStyle, ["padding-inline-start", "padding-left"]);
  const paddingInlineEnd = getCssPixels(computedStyle, ["padding-inline-end", "padding-right"]);
  const contentWidth = Math.max(1, element.clientWidth - paddingInlineStart - paddingInlineEnd);
  const measureElement = document.createElement("div");
  const measureStyle = measureElement.style;

  measureStyle.position = "absolute";
  measureStyle.visibility = "hidden";
  measureStyle.pointerEvents = "none";
  measureStyle.contain = "layout style";
  measureStyle.insetBlockStart = "0";
  measureStyle.insetInlineStart = "-99999px";
  measureStyle.border = "0";
  measureStyle.padding = "0";
  measureStyle.inlineSize = `${contentWidth}px`;
  measureStyle.font = computedStyle.font;
  measureStyle.letterSpacing = computedStyle.letterSpacing;
  measureStyle.lineHeight = computedStyle.lineHeight;
  measureStyle.whiteSpace = computedStyle.whiteSpace;
  measureStyle.overflowWrap = computedStyle.overflowWrap;
  measureStyle.wordBreak = computedStyle.wordBreak;
  measureStyle.setProperty("tab-size", computedStyle.getPropertyValue("tab-size"));

  return measureElement;
}

export function measureCodeLineNumberDisplay(
  element: HTMLElement,
  text: string,
  codeBlockConfig: BlockEditorCodeBlockConfig,
  shellRect: ElementRect,
  codeRect: ElementRect,
  scrollOffset: ScrollOffset,
): CodeBlockLineNumberDisplayState | null {
  if (!codeBlockConfig.showLineNumbers) {
    return null;
  }

  const computedStyle = window.getComputedStyle(element);
  const borderBlockStart = getCssPixels(computedStyle, [
    "border-block-start-width",
    "border-top-width",
  ]);
  const borderBlockEnd = getCssPixels(computedStyle, [
    "border-block-end-width",
    "border-bottom-width",
  ]);
  const borderInlineStart = getCssPixels(computedStyle, [
    "border-inline-start-width",
    "border-left-width",
  ]);
  const paddingBlockStart = getCssPixels(computedStyle, ["padding-block-start", "padding-top"]);
  const paddingBlockEnd = getCssPixels(computedStyle, ["padding-block-end", "padding-bottom"]);
  const paddingInlineStart = getCssPixels(computedStyle, ["padding-inline-start", "padding-left"]);
  const lineNumberPaddingInlineStart = getCssPixels(computedStyle, [
    "--block-editor-code-line-number-padding-inline-start",
  ]);
  const lineNumberWidth =
    getCssPixels(computedStyle, ["--block-editor-code-line-number-width"]) || paddingInlineStart;
  const lineHeight = getComputedLineHeight(computedStyle);
  const lines = getCodeLines(text);
  const gutter: CodeBlockLineNumberGutterViewState = {
    height: Math.max(
      0,
      codeRect.height - borderBlockStart - borderBlockEnd - paddingBlockStart - paddingBlockEnd,
    ),
    left:
      codeRect.left -
      shellRect.left +
      scrollOffset.left +
      borderInlineStart +
      lineNumberPaddingInlineStart,
    lineHeight: `${lineHeight}px`,
    top: codeRect.top - shellRect.top + scrollOffset.top + borderBlockStart + paddingBlockStart,
    width: lineNumberWidth,
  };

  if (!codeBlockConfig.wordWrap || !document.body) {
    return {
      gutter,
      lineNumbers: lines.map((_, index) => ({
        number: index + 1,
        top: index * lineHeight,
      })),
    };
  }

  const measureElement = createCodeLineMeasureElement(element, computedStyle);
  document.body.append(measureElement);

  try {
    let nextLineTop = 0;

    return {
      gutter,
      lineNumbers: lines.map((line, index) => {
        const lineNumber = {
          number: index + 1,
          top: nextLineTop,
        };
        const lineElement = document.createElement("div");

        lineElement.textContent = line.length === 0 ? "\u00a0" : line;
        lineElement.style.minBlockSize = `${lineHeight}px`;
        measureElement.append(lineElement);
        nextLineTop += lineElement.getBoundingClientRect().height || lineHeight;

        return lineNumber;
      }),
    };
  } finally {
    measureElement.remove();
  }
}

export function areLineNumbersEqual(
  previousLineNumbers: ReadonlyArray<CodeBlockLineNumberViewState>,
  nextLineNumbers: ReadonlyArray<CodeBlockLineNumberViewState>,
): boolean {
  if (previousLineNumbers.length !== nextLineNumbers.length) {
    return false;
  }

  return previousLineNumbers.every((previousLineNumber, index) => {
    const nextLineNumber = nextLineNumbers[index];
    return (
      previousLineNumber.number === nextLineNumber.number &&
      previousLineNumber.top === nextLineNumber.top
    );
  });
}

function areLineNumberGuttersEqual(
  previousGutter: CodeBlockLineNumberGutterViewState,
  nextGutter: CodeBlockLineNumberGutterViewState,
): boolean {
  return (
    previousGutter.height === nextGutter.height &&
    previousGutter.left === nextGutter.left &&
    previousGutter.lineHeight === nextGutter.lineHeight &&
    previousGutter.top === nextGutter.top &&
    previousGutter.width === nextGutter.width
  );
}

export function areLineNumberDisplaysEqual(
  previousDisplay: CodeBlockLineNumberDisplayState | null,
  nextDisplay: CodeBlockLineNumberDisplayState | null,
): boolean {
  if (previousDisplay === null || nextDisplay === null) {
    return previousDisplay === nextDisplay;
  }

  return (
    areLineNumberGuttersEqual(previousDisplay.gutter, nextDisplay.gutter) &&
    areLineNumbersEqual(previousDisplay.lineNumbers, nextDisplay.lineNumbers)
  );
}
