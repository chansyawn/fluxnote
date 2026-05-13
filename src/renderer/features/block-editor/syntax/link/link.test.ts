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
import { getLinkElementClassState, type LinkElementClassState } from "./link-dom";
import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  setMarkdownLinkUrl,
} from "./link-model";

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
});
