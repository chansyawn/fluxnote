import { $isAutoLinkNode, $isLinkNode, type LinkNode } from "@lexical/link";
import {
  $getRoot,
  $isElementNode,
  SKIP_DOM_SELECTION_TAG,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type UpdateTag,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, editorFromMdast, readMarkdown } from "../../test-helper/editor-driver";
import { doc, link, p, t } from "../../test-helper/mdast-builders";
import { getLinkElementClassState, type LinkElementClassState } from "./link-dom";
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

function readFirstLinkClassState(editor: LexicalEditor): LinkElementClassState {
  return readFirstLink(editor, getLinkElementClassState);
}

function createPopoverElementStub(activeElement: Element | null, containedElement: Element) {
  return {
    ownerDocument: { activeElement },
    contains: (node: Node | null) => node === containedElement,
  } as unknown as HTMLElement;
}

describe("link", () => {
  describe("round-trip", () => {
    it("preserves markdown links", () => {
      const editor = editorFromMdast(doc(p(link("https://example.com", t("site")))));

      expect(readMarkdown(editor).trim()).toBe("[site](https://example.com)");
    });

    it("exports bare urls as plain markdown text", () => {
      const editor = editorFromMarkdown("https://example.com");

      expect(readMarkdown(editor).trim()).toBe("https://example.com");
    });

    it("does not preserve angle bracket urls", () => {
      const editor = editorFromMarkdown("<https://example.com>");

      expect(readMarkdown(editor).trim()).toBe("https://example.com");
    });

    it("imports bare urls as autolink nodes", () => {
      const editor = editorFromMarkdown("https://example.com");

      expect(readFirstLink(editor, (node) => $isAutoLinkNode(node))).toBe(true);
    });
  });

  describe("operations", () => {
    it("sanitizes url input line breaks", () => {
      expect(sanitizeLinkUrlInput("https://example.com/a\nb\r\nc")).toBe("https://example.com/abc");
    });

    it("converts autolinks to markdown links", () => {
      const editor = editorFromMarkdown("https://example.com");
      const key = readFirstLinkKey(editor);

      convertAutoLinkToMarkdownLink(editor, key);

      expect(readMarkdown(editor).trim()).toBe("[https://example.com](https://example.com)");
    });

    it("updates markdown link urls", () => {
      const editor = editorFromMarkdown("[site](https://example.com)");
      const key = readFirstLinkKey(editor);

      setMarkdownLinkUrl(editor, key, "https://example.org");

      expect(readMarkdown(editor).trim()).toBe("[site](https://example.org)");
    });

    it("applies successive markdown link url updates immediately", () => {
      const editor = editorFromMarkdown("[site](https://example.com)");
      const key = readFirstLinkKey(editor);

      setMarkdownLinkUrl(editor, key, "https://example.org");

      expect(readMarkdown(editor).trim()).toBe("[site](https://example.org)");

      setMarkdownLinkUrl(editor, key, "https://example.net");

      expect(readMarkdown(editor).trim()).toBe("[site](https://example.net)");
    });

    it("skips DOM selection sync when updating markdown link urls", () => {
      const editor = editorFromMarkdown("[site](https://example.com)");
      const key = readFirstLinkKey(editor);
      const updateTags: UpdateTag[] = [];
      const unregister = editor.registerUpdateListener(({ tags }) => {
        updateTags.push(...tags);
      });

      setMarkdownLinkUrl(editor, key, "https://example.org");
      unregister();

      expect(updateTags).toContain(SKIP_DOM_SELECTION_TAG);
      expect(readMarkdown(editor).trim()).toBe("[site](https://example.org)");
    });

    it("removes markdown links while preserving inline content", () => {
      const editor = editorFromMarkdown("[**site**](https://example.com)");
      const key = readFirstLinkKey(editor);

      removeMarkdownLink(editor, key);

      expect(readMarkdown(editor).trim()).toBe("**site**");
    });
  });

  describe("element class state", () => {
    it("classifies markdown links", () => {
      const editor = editorFromMarkdown("[site](https://example.com)");

      expect(readFirstLinkClassState(editor)).toEqual({
        auto: false,
        markdown: true,
      });
    });

    it("classifies autolinks", () => {
      const editor = editorFromMarkdown("https://example.com");

      expect(readFirstLinkClassState(editor)).toEqual({
        auto: true,
        markdown: false,
      });
    });

    it("classifies converted autolinks as markdown links", () => {
      const editor = editorFromMarkdown("https://example.com");
      const key = readFirstLinkKey(editor);

      convertAutoLinkToMarkdownLink(editor, key);

      expect(readFirstLinkClassState(editor)).toEqual({
        auto: false,
        markdown: true,
      });
    });
  });

  describe("popover focus", () => {
    it("keeps the popover active when focus remains inside it", () => {
      const textarea = {} as Element;
      const popoverElement = createPopoverElementStub(textarea, textarea);

      expect(isElementFocusedWithin(popoverElement)).toBe(true);
    });

    it("allows the popover to close when focus moves outside it", () => {
      const textarea = {} as Element;
      const outsideElement = {} as Element;
      const popoverElement = createPopoverElementStub(outsideElement, textarea);

      expect(isElementFocusedWithin(popoverElement)).toBe(false);
    });

    it("allows the popover to close when no popover element is mounted", () => {
      expect(isElementFocusedWithin(null)).toBe(false);
    });
  });
});
