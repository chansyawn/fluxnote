import { $createCodeNode, $isCodeNode, type CodeNode } from "@lexical/code";
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

import { getNearestAncestor } from "../container/selection";

type CodeSplitPosition = "start" | "middle" | "end";

interface CodeCursorContext {
  codeNode: CodeNode;
  language: string | null | undefined;
  offset: number;
  position: CodeSplitPosition;
  text: string;
}

function isNodeInsideCode(node: LexicalNode, codeNode: CodeNode): boolean {
  let current: LexicalNode | null = node;

  while (current) {
    if (current.is(codeNode)) {
      return true;
    }
    current = current.getParent();
  }

  return false;
}

function getOffsetBeforeNode(node: LexicalNode, boundary: CodeNode): number {
  let offset = 0;
  let current: LexicalNode | null = node;

  while (current && !current.is(boundary)) {
    for (const sibling of current.getPreviousSiblings()) {
      offset += sibling.getTextContentSize();
    }
    current = current.getParent();
  }

  return offset;
}

function getCodeCursorContext(selection: RangeSelection): CodeCursorContext | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const codeNode = getNearestAncestor(anchorNode, $isCodeNode);
  if (!codeNode || !isNodeInsideCode(anchorNode, codeNode)) {
    return null;
  }

  const text = codeNode.getTextContent();
  const offset =
    selection.anchor.type === "text"
      ? getOffsetBeforeNode(anchorNode, codeNode) + selection.anchor.offset
      : selection.anchor.offset;
  const position: CodeSplitPosition =
    offset === 0 ? "start" : offset === text.length ? "end" : "middle";

  return {
    codeNode,
    language: codeNode.getLanguage(),
    offset,
    position,
    text,
  };
}

function createCodeNodeWithText(language: string | null | undefined, text: string): CodeNode {
  const codeNode = $createCodeNode(language);
  if (text.length > 0) {
    codeNode.append($createTextNode(text));
  }
  return codeNode;
}

function insertParagraphBeforeCode(codeNode: CodeNode): boolean {
  const parent = codeNode.getParent();
  if (!$isElementNode(parent)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  codeNode.insertBefore(paragraph);
  paragraph.selectStart();
  return true;
}

function insertParagraphAfterCode(codeNode: CodeNode): boolean {
  const parent = codeNode.getParent();
  if (!$isElementNode(parent)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  codeNode.insertAfter(paragraph);
  paragraph.selectStart();
  return true;
}

function splitCodeNodeAtCursor(context: CodeCursorContext): boolean {
  const { codeNode, language, offset, text } = context;
  const firstCodeNode = createCodeNodeWithText(language, text.slice(0, offset));
  const secondCodeNode = createCodeNodeWithText(language, text.slice(offset));

  codeNode.replace(firstCodeNode);
  firstCodeNode.insertAfter(secondCodeNode);
  secondCodeNode.selectStart();
  return true;
}

export function applyAltEnterAtCodeSelection(selection: RangeSelection): boolean {
  const context = getCodeCursorContext(selection);
  if (!context) {
    return false;
  }

  if (context.position === "start") {
    return insertParagraphBeforeCode(context.codeNode);
  }

  if (context.position === "end") {
    return insertParagraphAfterCode(context.codeNode);
  }

  return splitCodeNodeAtCursor(context);
}
