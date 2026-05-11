import {
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  type ElementNode,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

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
