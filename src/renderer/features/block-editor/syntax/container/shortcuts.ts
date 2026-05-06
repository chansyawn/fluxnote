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
  $isElementNode,
  type ElementNode,
  type LexicalNode,
  type RangeSelection,
  type TextNode,
} from "lexical";

export interface ContainerShortcutContext {
  anchorNode: TextNode;
  anchorOffset: number;
  parentNode: ElementNode;
}

export interface AfterContainerTransformContext {
  containerNode: ElementNode | null;
  leadingNode: TextNode;
  nextNode: LexicalNode | null;
  parentNode: ElementNode;
  previousNode: LexicalNode | null;
}

type AfterTransform = (context: AfterContainerTransformContext) => void;

function isElementTransformer(transformer: Transformer): transformer is ElementTransformer {
  return transformer.type === "element";
}

function isMultilineElementTransformer(
  transformer: Transformer,
): transformer is MultilineElementTransformer {
  return transformer.type === "multiline-element";
}

function isBareTaskMarkerShortcut(textContent: string, anchorOffset: number): boolean {
  return /^\s?\[\]\s$/i.test(textContent.slice(0, anchorOffset));
}

export function removeLeadingShortcutNode({ leadingNode }: AfterContainerTransformContext): void {
  leadingNode.remove();
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

export function selectStartAfterContainerTransform({
  containerNode,
  nextNode,
  previousNode,
}: AfterContainerTransformContext): void {
  const fallbackNode = getFallbackSelectionNode(containerNode, previousNode, nextNode);

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
  context: ContainerShortcutContext,
  transformers: ReadonlyArray<ElementTransformer>,
  afterTransform: AfterTransform,
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
      afterTransform({ containerNode, leadingNode, nextNode, parentNode, previousNode });
      return true;
    }
  }

  return false;
}

function runMultilineElementTransformers(
  context: ContainerShortcutContext,
  transformers: ReadonlyArray<MultilineElementTransformer>,
  triggerOnEnter: boolean,
  afterTransform: AfterTransform,
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
      afterTransform({ containerNode, leadingNode, nextNode, parentNode, previousNode });
      return true;
    }
  }

  return false;
}

export function applyContainerMarkdownShortcut(
  selection: RangeSelection,
  transformers: ReadonlyArray<Transformer>,
  getContext: (selection: RangeSelection) => ContainerShortcutContext | null,
  afterTransform: AfterTransform,
): boolean {
  const context = getContext(selection);
  if (!context) {
    return false;
  }

  return (
    runElementTransformers(context, transformers.filter(isElementTransformer), afterTransform) ||
    runMultilineElementTransformers(
      context,
      transformers.filter(isMultilineElementTransformer),
      false,
      afterTransform,
    )
  );
}

export function applyContainerMultilineShortcut(
  selection: RangeSelection,
  transformers: ReadonlyArray<Transformer>,
  getContext: (selection: RangeSelection) => ContainerShortcutContext | null,
  afterTransform: AfterTransform,
): boolean {
  const context = getContext(selection);
  if (!context) {
    return false;
  }

  return runMultilineElementTransformers(
    context,
    transformers.filter(isMultilineElementTransformer),
    true,
    afterTransform,
  );
}
