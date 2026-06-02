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
import { selectText, selectTextRange } from "../../test-helper/interaction-driver";
import { doc, link, p, t } from "../../test-helper/mdast-builders";
import {
  executeLinkActionAtSelection,
  isLinkActionDisabledAtSelection,
  isMarkdownLinkActiveAtSelection,
} from "./link-action";
import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  sanitizeLinkUrlInput,
  setMarkdownLinkUrl,
} from "./link-model";
import {
  createNextLinkUrlInputFocusRequest,
  isElementFocusedWithin,
} from "./use-active-link-target";

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

function readEditor<T>(editor: LexicalEditor, read: () => T): T {
  let result: T | undefined;
  editor.getEditorState().read(() => {
    result = read();
  });
  if (result === undefined) throw new Error("Expected editor read result.");
  return result;
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

  it("creates a URL input focus request token for explicit editor opens", () => {
    const first = createNextLinkUrlInputFocusRequest(null, "link-1");
    const second = createNextLinkUrlInputFocusRequest(first, "link-1");
    const third = createNextLinkUrlInputFocusRequest(second, "link-2");

    expect(first).toEqual({ key: "link-1", token: 1 });
    expect(second).toEqual({ key: "link-1", token: 2 });
    expect(third).toEqual({ key: "link-2", token: 3 });
  });

  it("creates an empty markdown link from selected text", () => {
    const editor = editorFromMarkdown("Alpha Beta");
    selectTextRange(editor, "Alpha Beta", 0, 5);

    expect(executeLinkActionAtSelection(editor)).toMatchObject({
      key: expect.any(String),
      kind: "created",
    });

    expect(readMarkdown(editor).trim()).toBe("[Alpha]() Beta");
  });

  it("creates an empty markdown link from the current word", () => {
    const editor = editorFromMarkdown("Alpha Beta");
    selectText(editor, "Alpha Beta", "Alpha".length);

    expect(executeLinkActionAtSelection(editor)).toMatchObject({
      key: expect.any(String),
      kind: "created",
    });

    expect(readMarkdown(editor).trim()).toBe("[Alpha]() Beta");
  });

  it("disables link creation at empty text positions", () => {
    const editor = editorFromMarkdown("Alpha Beta");
    selectText(editor, "Alpha Beta", "Alpha ".length);

    expect(readEditor(editor, isLinkActionDisabledAtSelection)).toBe(true);
    expect(executeLinkActionAtSelection(editor)).toEqual({ kind: "disabled" });
    expect(readMarkdown(editor).trim()).toBe("Alpha Beta");
  });

  it("removes a markdown link when the caret is inside it", () => {
    const editor = editorFromMarkdown("[Alpha](https://example.com)");
    selectText(editor, "Alpha", 2);

    expect(readEditor(editor, isMarkdownLinkActiveAtSelection)).toBe(true);
    expect(executeLinkActionAtSelection(editor)).toEqual({ kind: "removed" });

    expect(readMarkdown(editor).trim()).toBe("Alpha");
  });

  it("removes a markdown link when the full link text is selected", () => {
    const editor = editorFromMarkdown("[Alpha](https://example.com) Beta");
    selectTextRange(editor, "Alpha", 0, 5);

    expect(executeLinkActionAtSelection(editor)).toEqual({ kind: "removed" });

    expect(readMarkdown(editor).trim()).toBe("Alpha Beta");
  });

  it("replaces selected markdown links with one new empty link", () => {
    const editor = editorFromMarkdown("A [linked](https://example.com) word");
    selectTextRange(editor, "linked", 0, 4);

    expect(executeLinkActionAtSelection(editor)).toMatchObject({
      key: expect.any(String),
      kind: "created",
    });

    expect(readMarkdown(editor).trim()).toBe("A [link]()[ed](https://example.com) word");
  });

  it("replaces a selected markdown link and surrounding text with one new empty link", () => {
    const editor = editorFromMarkdown("[Alpha](https://example.com) Beta");
    editor.update(
      () => {
        const textNodes = $getRoot().getAllTextNodes();
        textNodes[0].select(0, 0).setTextNodeRange(textNodes[0], 0, textNodes[1], 5);
      },
      { discrete: true },
    );

    expect(executeLinkActionAtSelection(editor)).toMatchObject({
      key: expect.any(String),
      kind: "created",
    });

    expect(readMarkdown(editor).trim()).toBe("[Alpha Beta]()");
  });

  it("does not treat autolinks as active links", () => {
    const editor = editorFromMarkdown("https://example.com");
    selectText(editor, "https://example.com", 4);

    expect(readEditor(editor, isMarkdownLinkActiveAtSelection)).toBe(false);
    expect(readEditor(editor, isLinkActionDisabledAtSelection)).toBe(false);
  });
});
