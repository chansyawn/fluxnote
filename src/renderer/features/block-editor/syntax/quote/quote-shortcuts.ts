import { $isCodeNode } from "@lexical/code";
import { $isListItemNode, $isListNode } from "@lexical/list";
import {
  CHECK_LIST,
  type ElementTransformer,
  type MultilineElementTransformer,
  type Transformer,
} from "@lexical/markdown";
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
  type TextNode,
} from "lexical";

import { getContainingQuote, getElementParent, getSelectionAnchorNode } from "./quote-selection";
import { normalizeQuoteBlockChildren } from "./quote-structure";

interface ShortcutContext {
  anchorNode: TextNode;
  anchorOffset: number;
  parentNode: ElementNode;
}

function isElementTransformer(transformer: Transformer): transformer is ElementTransformer {
  return transformer.type === "element";
}

function isMultilineElementTransformer(
  transformer: Transformer,
): transformer is MultilineElementTransformer {
  return transformer.type === "multiline-element";
}

function getTransformerParent(anchorNode: TextNode): ElementNode | null {
  const quote = getContainingQuote(anchorNode);
  if (!quote) {
    return null;
  }

  normalizeQuoteBlockChildren(quote);
  const parent = getElementParent(anchorNode);
  if (!$isElementNode(parent) || $isCodeNode(parent)) {
    return null;
  }

  return parent;
}

function getShortcutContext(selection: RangeSelection): ShortcutContext | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchorNode = getSelectionAnchorNode(selection);
  if (!$isTextNode(anchorNode) || anchorNode.hasFormat("code")) {
    return null;
  }

  const parentNode = getTransformerParent(anchorNode);
  if (!parentNode || parentNode.getFirstChild() !== anchorNode) {
    return null;
  }

  return {
    anchorNode,
    anchorOffset: selection.anchor.offset,
    parentNode,
  };
}

function isBareTaskMarkerShortcut(textContent: string, anchorOffset: number): boolean {
  return /^\s?\[\]\s$/i.test(textContent.slice(0, anchorOffset));
}

function getFallbackSelectionNode(
  containerNode: ElementNode | null,
  previousNode: LexicalNode | null,
  nextNode: LexicalNode | null,
): LexicalNode | null {
  if (previousNode && $getNodeByKey(previousNode.getKey())) {
    const insertedAfterPrevious = previousNode.getNextSibling();
    if (insertedAfterPrevious) {
      return insertedAfterPrevious;
    }
  }

  if (nextNode && $getNodeByKey(nextNode.getKey())) {
    const insertedBeforeNext = nextNode.getPreviousSibling();
    if (insertedBeforeNext) {
      return insertedBeforeNext;
    }
  }

  return containerNode && $getNodeByKey(containerNode.getKey())
    ? containerNode.getFirstChild()
    : null;
}

function ensureSelectionAfterTransform(fallbackNode: LexicalNode | null): void {
  if ($isListNode(fallbackNode)) {
    const firstItem = fallbackNode.getFirstChild();
    if ($isListItemNode(firstItem)) {
      const firstChild = firstItem.getFirstChild();
      if ($isElementNode(firstChild)) {
        firstChild.select(0, 0);
        return;
      }

      const paragraph = $createParagraphNode();
      paragraph.splice(0, 0, firstItem.getChildren());
      firstItem.splice(0, 0, [paragraph]);
      paragraph.select(0, 0);
      return;
    }
  }

  if ($isElementNode(fallbackNode)) {
    fallbackNode.select(0, 0);
  }
}

function runElementTransformers(
  context: ShortcutContext,
  transformers: ReadonlyArray<ElementTransformer>,
): boolean {
  const { anchorNode, anchorOffset, parentNode } = context;
  const textContent = anchorNode.getTextContent();
  if (textContent[anchorOffset - 1] !== " ") {
    return false;
  }

  for (const transformer of transformers) {
    const match = textContent.match(transformer.regExp);
    if (!match) {
      continue;
    }

    if (transformer === CHECK_LIST && isBareTaskMarkerShortcut(textContent, anchorOffset)) {
      continue;
    }

    const matchLength = match[0].endsWith(" ") ? anchorOffset : anchorOffset - 1;
    if (match[0].length !== matchLength) {
      continue;
    }

    const nextSiblings = anchorNode.getNextSiblings();
    const containerNode = parentNode.getParent();
    const previousNode = parentNode.getPreviousSibling();
    const nextNode = parentNode.getNextSibling();
    const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
    const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
    if (transformer.replace(parentNode, siblings, match, false) !== false) {
      const fallbackNode = getFallbackSelectionNode(containerNode, previousNode, nextNode);
      void leadingNode;
      ensureSelectionAfterTransform(fallbackNode);
      return true;
    }
  }

  return false;
}

function runMultilineElementTransformers(
  context: ShortcutContext,
  transformers: ReadonlyArray<MultilineElementTransformer>,
  triggerOnEnter: boolean,
): boolean {
  const { anchorNode, anchorOffset, parentNode } = context;
  const textContent = anchorNode.getTextContent();
  if (!triggerOnEnter && textContent[anchorOffset - 1] !== " ") {
    return false;
  }

  for (const transformer of transformers) {
    const { regExpEnd, regExpStart, replace } = transformer;
    if (regExpEnd && (!("optional" in regExpEnd) || !regExpEnd.optional)) {
      continue;
    }

    const match = textContent.match(regExpStart);
    if (!match) {
      continue;
    }

    const matchLength = triggerOnEnter || match[0].endsWith(" ") ? anchorOffset : anchorOffset - 1;
    if (match[0].length !== matchLength) {
      continue;
    }

    const nextSiblings = anchorNode.getNextSiblings();
    const containerNode = parentNode.getParent();
    const previousNode = parentNode.getPreviousSibling();
    const nextNode = parentNode.getNextSibling();
    const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
    const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
    if (replace(parentNode, siblings, match, null, null, false) !== false) {
      const fallbackNode = getFallbackSelectionNode(containerNode, previousNode, nextNode);
      void leadingNode;
      ensureSelectionAfterTransform(fallbackNode);
      return true;
    }
  }

  return false;
}

export function applyQuoteContainerMarkdownShortcutAtSelection(
  transformers: ReadonlyArray<Transformer>,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const context = getShortcutContext(selection);
  if (!context) {
    return false;
  }

  return (
    runElementTransformers(context, transformers.filter(isElementTransformer)) ||
    runMultilineElementTransformers(
      context,
      transformers.filter(isMultilineElementTransformer),
      false,
    )
  );
}

export function applyQuoteContainerMultilineShortcutAtSelection(
  selection: RangeSelection,
  transformers: ReadonlyArray<Transformer>,
): boolean {
  const context = getShortcutContext(selection);
  if (!context) {
    return false;
  }

  return runMultilineElementTransformers(
    context,
    transformers.filter(isMultilineElementTransformer),
    true,
  );
}
