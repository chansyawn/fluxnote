import { $isAutoLinkNode, $isLinkNode, type LinkNode } from "@lexical/link";
import {
  $getRoot,
  $isElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, editorFromMdast, readMarkdown } from "../../test-helper/editor-driver";
import { doc, link, p, t } from "../../test-helper/mdast-builders";
import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  sanitizeLinkUrlInput,
  setMarkdownLinkUrl,
} from "./link-model";
import { isElementFocusedWithin } from "./use-active-link-target";

function findFirstLinkNode(node: LexicalNode): LinkNode | null {
  if ($isLinkNode(node)) return node;

  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      const linkNode = findFirstLinkNode(child);
      if (linkNode) return linkNode;
    }
  }

  return null;
}

function readFirstLink<T>(editor: LexicalEditor, read: (node: LinkNode) => T): T {
  let result: T | null = null;

  editor.getEditorState().read(() => {
    const linkNode = findFirstLinkNode($getRoot());
    if (!linkNode) throw new Error("Expected a link node");
    result = read(linkNode);
  });

  if (result === null) throw new Error("Expected a link node");
  return result;
}

function readFirstLinkKey(editor: LexicalEditor): NodeKey {
  return readFirstLink(editor, (node) => node.getKey());
}

function createPopoverElementStub(activeElement: Element | null, containedElement: Element) {
  return {
    ownerDocument: { activeElement },
    contains: (node: Node | null) => node === containedElement,
  } as unknown as HTMLElement;
}

describe("link", () => {
  it("preserves explicit markdown links", () => {
    const editor = editorFromMdast(doc(p(link("https://example.com", t("site")))));

    expect(readMarkdown(editor).trim()).toBe("[site](https://example.com)");
  });

  it("keeps bare urls as plain markdown while tracking them as autolinks", () => {
    const editor = editorFromMarkdown("https://example.com");

    expect(readMarkdown(editor).trim()).toBe("https://example.com");
    expect(readFirstLink(editor, (node) => $isAutoLinkNode(node))).toBe(true);
  });

  it("normalizes angle bracket urls to plain markdown text", () => {
    const editor = editorFromMarkdown("<https://example.com>");

    expect(readMarkdown(editor).trim()).toBe("https://example.com");
  });

  it("sanitizes url input line breaks", () => {
    expect(sanitizeLinkUrlInput("https://example.com/a\nb\r\nc")).toBe("https://example.com/abc");
  });

  it("converts autolinks to explicit markdown links", () => {
    const editor = editorFromMarkdown("https://example.com");

    convertAutoLinkToMarkdownLink(editor, readFirstLinkKey(editor));

    expect(readMarkdown(editor).trim()).toBe("[https://example.com](https://example.com)");
  });

  it("updates explicit markdown link urls", () => {
    const editor = editorFromMarkdown("[site](https://example.com)");
    const key = readFirstLinkKey(editor);

    setMarkdownLinkUrl(editor, key, "https://example.org");
    expect(readMarkdown(editor).trim()).toBe("[site](https://example.org)");

    setMarkdownLinkUrl(editor, key, "https://example.net");
    expect(readMarkdown(editor).trim()).toBe("[site](https://example.net)");
  });

  it("removes explicit markdown links while preserving inline content", () => {
    const editor = editorFromMarkdown("[**site**](https://example.com)");

    removeMarkdownLink(editor, readFirstLinkKey(editor));

    expect(readMarkdown(editor).trim()).toBe("**site**");
  });

  it("turns explicit bare-url markdown links back into autolinks", () => {
    const editor = editorFromMarkdown("[https://example.com](https://example.com)");

    removeMarkdownLink(editor, readFirstLinkKey(editor));

    expect(readMarkdown(editor).trim()).toBe("https://example.com");
    expect(readFirstLink(editor, (node) => $isAutoLinkNode(node))).toBe(true);
  });

  it("keeps the popover active only while focus remains inside it", () => {
    const textarea = {} as Element;
    const outsideElement = {} as Element;

    expect(isElementFocusedWithin(createPopoverElementStub(textarea, textarea))).toBe(true);
    expect(isElementFocusedWithin(createPopoverElementStub(outsideElement, textarea))).toBe(false);
    expect(isElementFocusedWithin(null)).toBe(false);
  });
});
