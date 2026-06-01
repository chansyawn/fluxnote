import {
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $getSelection,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  type ElementNode,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  type PasteCommandType,
} from "lexical";

import { handleBlockEditorPaste } from "../clipboard/paste";
import type { BlockEditorRuntime } from "../core/types";
import { $isGapCursorParagraph } from "../cursor";

interface KeyboardCommandOptions {
  altKey?: boolean;
  shiftKey?: boolean;
}

function keyboardPayload({
  altKey = false,
  shiftKey = false,
}: KeyboardCommandOptions = {}): KeyboardEvent {
  return {
    altKey,
    preventDefault() {},
    shiftKey,
  } as KeyboardEvent;
}

function dispatchCommand<TPayload>(
  editor: LexicalEditor,
  command: LexicalCommand<TPayload>,
  payload: TPayload,
): boolean {
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(command, payload);
    },
    { discrete: true },
  );
  return handled;
}

function collectParagraphs(node: LexicalNode, paragraphs: ElementNode[] = []): ElementNode[] {
  if ($isParagraphNode(node)) {
    paragraphs.push(node);
  }

  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      collectParagraphs(child, paragraphs);
    }
  }

  return paragraphs;
}

export function selectText(editor: LexicalEditor, text: string, offset = text.length): void {
  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => node.getTextContent() === text);

      if (!textNode) {
        throw new Error(`Unable to find text node "${text}".`);
      }

      if (offset > textNode.getTextContentSize()) {
        throw new Error(`Selection offset ${offset} is outside "${text}".`);
      }

      textNode.select(offset, offset);
    },
    { discrete: true },
  );
}

export function selectTextRange(
  editor: LexicalEditor,
  text: string,
  start: number,
  end: number,
): void {
  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => node.getTextContent() === text);

      if (!textNode) {
        throw new Error(`Unable to find text node "${text}".`);
      }

      if (start < 0 || end > textNode.getTextContentSize() || start > end) {
        throw new Error(`Selection range ${start}:${end} is outside "${text}".`);
      }

      textNode.select(start, end);
    },
    { discrete: true },
  );
}

export function selectEmptyParagraph(
  editor: LexicalEditor,
  position: "first" | "last" = "last",
): void {
  editor.update(
    () => {
      const paragraphs = collectParagraphs($getRoot()).filter(
        (paragraph) => paragraph.getTextContentSize() === 0 && !$isGapCursorParagraph(paragraph),
      );
      const paragraph = position === "first" ? paragraphs[0] : paragraphs.at(-1);

      if (!paragraph) {
        throw new Error("Unable to find an empty paragraph.");
      }

      paragraph.selectStart();
    },
    { discrete: true },
  );
}

export function pressEnter(editor: LexicalEditor, options?: KeyboardCommandOptions): boolean {
  return dispatchCommand(editor, KEY_ENTER_COMMAND, keyboardPayload(options));
}

export function pressBackspace(editor: LexicalEditor): boolean {
  return dispatchCommand(editor, KEY_BACKSPACE_COMMAND, keyboardPayload());
}

export function pressTab(editor: LexicalEditor, options?: KeyboardCommandOptions): boolean {
  return dispatchCommand(editor, KEY_TAB_COMMAND, keyboardPayload(options));
}

export class TestDataTransfer {
  private readonly data: Map<string, string>;
  readonly files: File[];
  readonly items = [];
  readonly types: string[];

  constructor(data: Map<string, string>, files: File[] = []) {
    this.data = data;
    this.files = files;
    this.types = Array.from(data.keys());
  }

  getData(type: string): string {
    return this.data.get(type) ?? "";
  }

  setData(): void {}

  clearData(): void {}

  setDragImage(): void {}

  dropEffect = "none" as const;
  effectAllowed = "none" as const;
}

export function createPasteEvent(dataTransfer: DataTransfer | null): PasteCommandType {
  return {
    clipboardData: dataTransfer,
    preventDefault() {},
    stopPropagation() {},
  } as unknown as PasteCommandType;
}

export function pasteIntoEditor(
  editor: LexicalEditor,
  runtime: BlockEditorRuntime,
  data: Map<string, string>,
  files: File[] = [],
): boolean {
  const selection = editor.read(() => $getSelection()?.clone() ?? null);
  return handleBlockEditorPaste(
    editor,
    runtime,
    createPasteEvent(new TestDataTransfer(data, files) as unknown as DataTransfer),
    selection,
  );
}
