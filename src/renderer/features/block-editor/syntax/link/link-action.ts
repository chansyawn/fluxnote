import { $createLinkNode, $isLinkNode, $toggleLink } from "@lexical/link";
import {
  $getSelection,
  $getNodeByKey,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type RangeSelection,
  SKIP_DOM_SELECTION_TAG,
  type TextNode,
} from "lexical";

import {
  findLinkAncestor,
  isMarkdownLinkNode,
  OPEN_LINK_EDITOR_COMMAND,
  readLinkSnapshot,
  unwrapLinkNode,
  type LinkSnapshot,
} from "./link-model";

interface TextRange {
  end: number;
  node: TextNode;
  start: number;
}

interface CreateLinkTarget {
  ranges: TextRange[];
}

type LinkActionTarget =
  | { kind: "create"; target: CreateLinkTarget }
  | { kind: "remove"; link: LinkSnapshot }
  | { kind: "disabled" };

export type LinkActionResult =
  | { kind: "created"; key: NodeKey }
  | { kind: "removed" }
  | { kind: "disabled" };

const FALLBACK_WORD_REGEXP = /[\p{L}\p{N}_]+/gu;

function isTextLikeNode(node: LexicalNode): boolean {
  if ($isTextNode(node)) return true;
  if ($isLinkNode(node)) return true;
  return false;
}

function getInlineTextParent(node: LexicalNode): ElementNode | null {
  const parent = $isTextNode(node) ? node.getParent() : node;
  if (!$isElementNode(parent)) return null;

  if ($isLinkNode(parent)) {
    const linkParent = parent.getParent();
    return $isElementNode(linkParent) ? linkParent : null;
  }

  return parent;
}

function getSelectedTextRanges(selection: RangeSelection): TextRange[] | null {
  const nodes = selection.getNodes();
  if (nodes.length === 0) return null;

  const textNodes = nodes.filter($isTextNode);
  if (textNodes.length === 0) return null;

  const inlineParent = getInlineTextParent(textNodes[0]);
  if (!inlineParent) return null;

  for (const node of nodes) {
    if (!isTextLikeNode(node)) return null;
    if (getInlineTextParent(node) !== inlineParent) return null;
  }

  const isBackward = !selection.anchor.isBefore(selection.focus);
  const firstPoint = isBackward ? selection.focus : selection.anchor;
  const lastPoint = isBackward ? selection.anchor : selection.focus;
  const ranges: TextRange[] = [];

  for (const node of textNodes) {
    let start = 0;
    let end = node.getTextContentSize();

    if (node.getKey() === firstPoint.key && firstPoint.type === "text") {
      start = firstPoint.offset;
    }
    if (node.getKey() === lastPoint.key && lastPoint.type === "text") {
      end = lastPoint.offset;
    }

    if (start < end) ranges.push({ end, node, start });
  }

  return ranges.length > 0 ? ranges : null;
}

function getSelectedText(ranges: TextRange[]): string {
  return ranges.map(({ end, node, start }) => node.getTextContent().slice(start, end)).join("");
}

function findWordRanges(text: string): Array<{ end: number; start: number }> {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    return Array.from(segmenter.segment(text))
      .filter((segment) => segment.isWordLike)
      .map((segment) => ({
        end: segment.index + segment.segment.length,
        start: segment.index,
      }));
  }

  return Array.from(text.matchAll(FALLBACK_WORD_REGEXP), (match) => ({
    end: match.index + match[0].length,
    start: match.index,
  }));
}

function resolveCollapsedWordRange(selection: RangeSelection): TextRange | null {
  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode) || selection.anchor.type !== "text") return null;

  const offset = selection.anchor.offset;
  const words = findWordRanges(anchorNode.getTextContent());
  const word =
    words.find((candidate) => candidate.start < offset && offset <= candidate.end) ??
    (offset === 0 ? words.find((candidate) => candidate.start === offset) : undefined) ??
    null;

  return word ? { end: word.end, node: anchorNode, start: word.start } : null;
}

function isExactMarkdownLinkSelection(ranges: TextRange[]): LinkSnapshot | null {
  const links = new Set<NodeKey>();
  let linkNode: ReturnType<typeof findLinkAncestor> = null;

  for (const range of ranges) {
    const currentLink = findLinkAncestor(range.node);
    if (!isMarkdownLinkNode(currentLink)) return null;
    links.add(currentLink.getKey());
    linkNode = currentLink;
  }

  if (links.size !== 1 || !isMarkdownLinkNode(linkNode)) return null;

  const children = linkNode.getAllTextNodes();
  if (children.length !== ranges.length) return null;

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    const child = children[index];
    if (range.node !== child) return null;
    if (range.start !== 0 || range.end !== child.getTextContentSize()) return null;
  }

  return readLinkSnapshot(linkNode);
}

function selectRanges(ranges: TextRange[]): RangeSelection {
  const first = ranges[0];
  const last = ranges.at(-1);
  if (!last) throw new Error("Expected at least one text range.");
  return first.node
    .select(first.start, first.start)
    .setTextNodeRange(first.node, first.start, last.node, last.end);
}

function wrapCurrentSelectionAsLink(url: string): LinkSnapshot | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const extractedNodes = selection.extract().filter($isTextNode);
  if (extractedNodes.length === 0) return null;

  const link = $createLinkNode(url);
  const firstNode = extractedNodes[0];
  firstNode.insertBefore(link);

  for (const node of extractedNodes) {
    link.append(node);
  }

  return readLinkSnapshot(link);
}

function resolveLinkActionTarget(): LinkActionTarget {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return { kind: "disabled" };

  if (selection.isCollapsed()) {
    const link = findLinkAncestor(selection.anchor.getNode());
    if (isMarkdownLinkNode(link)) {
      return { kind: "remove", link: readLinkSnapshot(link) };
    }

    const wordRange = resolveCollapsedWordRange(selection);
    if (!wordRange) return { kind: "disabled" };
    return { kind: "create", target: { ranges: [wordRange] } };
  }

  const ranges = getSelectedTextRanges(selection);
  if (!ranges) return { kind: "disabled" };

  const text = getSelectedText(ranges);
  if (text.length === 0 || text.includes("\n")) return { kind: "disabled" };

  const exactLink = isExactMarkdownLinkSelection(ranges);
  if (exactLink) return { kind: "remove", link: exactLink };

  return { kind: "create", target: { ranges } };
}

export function isMarkdownLinkActiveAtSelection(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  return isMarkdownLinkNode(findLinkAncestor(selection.anchor.getNode()));
}

export function isLinkActionDisabledAtSelection(): boolean {
  return resolveLinkActionTarget().kind === "disabled";
}

export function executeLinkActionAtSelection(editor: LexicalEditor): LinkActionResult {
  let result: LinkActionResult = { kind: "disabled" };

  editor.update(
    () => {
      const target = resolveLinkActionTarget();
      if (target.kind === "disabled") {
        result = { kind: "disabled" };
        return;
      }

      if (target.kind === "remove") {
        const node = $getNodeByKey(target.link.key);
        if (isMarkdownLinkNode(node)) {
          unwrapLinkNode(node);
          result = { kind: "removed" };
          return;
        }

        result = { kind: "disabled" };
        return;
      }

      selectRanges(target.target.ranges);
      $toggleLink(null);
      const link = wrapCurrentSelectionAsLink("");
      if (!link) {
        result = { kind: "disabled" };
        return;
      }

      editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, {
        focusUrlInput: true,
        key: link.key,
      });
      result = { kind: "created", key: link.key };
    },
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );

  return result;
}
