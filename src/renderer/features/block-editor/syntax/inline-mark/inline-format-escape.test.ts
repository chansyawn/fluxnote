import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  type TextFormatType,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, readMarkdown } from "../../test-helper/editor-driver";
import { pressEnter } from "../../test-helper/interaction-driver";

interface InlineFormatCase {
  format: TextFormatType;
  markdown: string;
  text: string;
  withFormattedInfix: string;
  withPlainSuffix: string;
  withPlainParagraph: string;
}

const INLINE_FORMAT_CASES: InlineFormatCase[] = [
  {
    format: "bold",
    markdown: "**bold**",
    text: "bold",
    withFormattedInfix: "**bXold**",
    withPlainParagraph: "**bold**\n\nplain",
    withPlainSuffix: "**bold** plain",
  },
  {
    format: "italic",
    markdown: "*italic*",
    text: "italic",
    withFormattedInfix: "*iXtalic*",
    withPlainParagraph: "*italic*\n\nplain",
    withPlainSuffix: "*italic* plain",
  },
  {
    format: "strikethrough",
    markdown: "~~strike~~",
    text: "strike",
    withFormattedInfix: "~~sXtrike~~",
    withPlainParagraph: "~~strike~~\n\nplain",
    withPlainSuffix: "~~strike~~ plain",
  },
  {
    format: "code",
    markdown: "`code`",
    text: "code",
    withFormattedInfix: "`cXode`",
    withPlainParagraph: "`code`\n\nplain",
    withPlainSuffix: "`code` plain",
  },
];

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

function pressArrowRight(editor: LexicalEditor): boolean {
  return dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, {
    preventDefault() {},
    shiftKey: false,
  } as KeyboardEvent);
}

function insertText(editor: LexicalEditor, text: string): boolean {
  return dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, text);
}

function selectFormattedText(editor: LexicalEditor, text: string, offset = text.length): void {
  editor.update(
    () => {
      const textNode = $getRoot()
        .getAllTextNodes()
        .find((node) => node.getTextContent() === text);

      if (!textNode || !$isTextNode(textNode)) {
        throw new Error(`Unable to find text node "${text}".`);
      }

      if (offset > textNode.getTextContentSize()) {
        throw new Error(`Selection offset ${offset} is outside "${text}".`);
      }

      textNode.select(offset, offset);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.setFormat(textNode.getFormat());
        selection.setStyle(textNode.getStyle());
      }
    },
    { discrete: true },
  );
}

describe("inline format escape", () => {
  for (const inlineFormat of INLINE_FORMAT_CASES) {
    it(`escapes ${inlineFormat.format} at the end boundary before plain text insertion`, () => {
      const editor = editorFromMarkdown(inlineFormat.markdown);

      selectFormattedText(editor, inlineFormat.text);
      pressArrowRight(editor);
      insertText(editor, " plain");

      expect(readMarkdown(editor).trim()).toBe(inlineFormat.withPlainSuffix);
    });

    it(`escapes ${inlineFormat.format} at the end boundary before paragraph insertion`, () => {
      const editor = editorFromMarkdown(inlineFormat.markdown);

      selectFormattedText(editor, inlineFormat.text);
      expect(pressEnter(editor)).toBe(true);
      insertText(editor, "plain");

      expect(readMarkdown(editor).trim()).toBe(inlineFormat.withPlainParagraph);
    });

    it(`keeps ${inlineFormat.format} active away from the boundary`, () => {
      const editor = editorFromMarkdown(inlineFormat.markdown);

      selectFormattedText(editor, inlineFormat.text, 1);
      pressArrowRight(editor);
      insertText(editor, "X");

      expect(readMarkdown(editor).trim()).toBe(inlineFormat.withFormattedInfix);
    });
  }
});
