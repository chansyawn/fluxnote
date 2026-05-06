import { $isCodeNode } from "@lexical/code";
import { $isListItemNode } from "@lexical/list";
import {
  CHECK_LIST,
  type ElementTransformer,
  type MultilineElementTransformer,
  type Transformer,
} from "@lexical/markdown";
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  type RangeSelection,
  type TextNode,
} from "lexical";

import { getCurrentListItem } from "./list-selection";
import { wrapListItemInlineChildrenInParagraphs } from "./list-structure";

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
  let parent = anchorNode.getParent();
  if ($isListItemNode(parent)) {
    /*
     * Lexical list items can temporarily hold inline children when users type
     * directly after the marker. The semantic model expects block children, so
     * normalize inline runs into a paragraph before running block transformers.
     */
    wrapListItemInlineChildrenInParagraphs(parent);
    parent = anchorNode.getParent();
  }

  if (!$isElementNode(parent) || $isCodeNode(parent)) {
    return null;
  }

  return parent;
}

function getShortcutContext(selection: RangeSelection): ShortcutContext | null {
  /*
   * Markdown shortcuts should only run for a collapsed cursor at the start of a
   * text-bearing block inside a list item. This mirrors Lexical's root shortcut
   * behavior and prevents shortcuts from firing in the middle of existing text,
   * inline code, or nested structured nodes that own their own parsing rules.
   */
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode) || anchorNode.hasFormat("code")) {
    return null;
  }

  const parentNode = getTransformerParent(anchorNode);
  if (!parentNode || parentNode.getFirstChild() !== anchorNode) {
    return null;
  }

  if (!getCurrentListItem(selection)) {
    return null;
  }

  return {
    anchorNode,
    anchorOffset: selection.anchor.offset,
    parentNode,
  };
}

function isBareTaskMarkerShortcut(textContent: string, anchorOffset: number): boolean {
  /*
   * CHECK_LIST is intentionally skipped for the bare unchecked marker because
   * TaskListShortcutPlugin owns [] conversion. Checked markers remain available
   * to Lexical's shared CHECK_LIST transformer.
   */
  return /^\s?\[\]\s$/i.test(textContent.slice(0, anchorOffset));
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
    const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
    const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
    /*
     * Transformer replacement receives the normalized block parent plus the
     * remaining inline siblings. This is the same data shape Lexical's Markdown
     * plugin expects at the root level, which lets headings, quotes and nested
     * lists work inside list-item containers without duplicating parser logic.
     */
    if (transformer.replace(parentNode, siblings, match, false) !== false) {
      leadingNode.remove();
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
    const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
    const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
    /*
     * Multiline shortcuts such as fenced code can be triggered by the normal
     * trailing space path or by Enter. Only optional-end transformers are handled
     * here, because non-optional multiline parsing needs a complete range and is
     * better left to the standard Markdown import/export pipeline.
     */
    if (replace(parentNode, siblings, match, null, null, false) !== false) {
      leadingNode.remove();
      return true;
    }
  }

  return false;
}

export function applyListContainerMarkdownShortcutAtSelection(
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

export function applyListContainerMultilineShortcutAtSelection(
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
