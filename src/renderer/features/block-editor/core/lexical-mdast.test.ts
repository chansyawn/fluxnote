import { $isAutoLinkNode, $isLinkNode } from "@lexical/link";
import {
  $getRoot,
  $isElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from "lexical";
import { describe, expect, it } from "vitest";

import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  updateMarkdownLinkUrl,
} from "../syntax/link/link-operations";
import { expectMarkdownRoundTripStable } from "../test-helper/assertions";
import {
  editorFromMarkdown,
  editorFromMdast,
  readMarkdown,
  readMdast,
} from "../test-helper/editor-driver";
import {
  bold,
  doc,
  h,
  inlineCode,
  italic,
  li,
  link,
  ol,
  p,
  quote,
  strike,
  t,
  ul,
} from "../test-helper/mdast-builders";

function readFirstLinkKey(editor: LexicalEditor): NodeKey {
  let key: NodeKey | null = null;
  editor.getEditorState().read(() => {
    const visit = (node: LexicalNode): void => {
      if ($isLinkNode(node)) {
        key = node.getKey();
        return;
      }
      if ($isElementNode(node)) {
        for (const child of node.getChildren()) {
          visit(child);
        }
      }
    };
    visit($getRoot());
  });

  if (!key) throw new Error("Expected a link node");
  return key;
}

describe("lexical-mdast", () => {
  describe("paragraph", () => {
    it("imports and exports a single paragraph", () => {
      const editor = editorFromMdast(doc(p(t("hello"))));
      expect(readMarkdown(editor).trim()).toBe("hello");
    });

    it("preserves inline formatting", () => {
      const editor = editorFromMdast(doc(p(bold(t("strong")), t(" "), italic(t("italic")))));
      const markdown = readMarkdown(editor).trim();
      expect(markdown).toContain("**strong**");
      expect(markdown).toContain("*italic*");
    });
  });

  describe("heading", () => {
    it("imports and exports h1-h6", () => {
      for (let depth = 1; depth <= 6; depth++) {
        const editor = editorFromMdast(doc(h(depth, t(`heading ${depth}`))));
        const markdown = readMarkdown(editor).trim();
        expect(markdown).toBe(`${"#".repeat(depth)} heading ${depth}`);
      }
    });
  });

  describe("blockquote", () => {
    it("preserves nested content", () => {
      const editor = editorFromMdast(doc(quote(p(t("first")), p(t("second")))));
      const markdown = readMarkdown(editor).trim();
      expect(markdown).toContain("> first");
      expect(markdown).toContain("> second");
    });
  });

  describe("list", () => {
    it("imports and exports unordered list", () => {
      const editor = editorFromMdast(doc(ul(li([p(t("a"))]), li([p(t("b"))]))));
      const markdown = readMarkdown(editor).trim();
      expect(markdown).toContain("- a");
      expect(markdown).toContain("- b");
    });

    it("imports and exports ordered list", () => {
      const editor = editorFromMdast(doc(ol(li([p(t("first"))]), li([p(t("second"))]))));
      const markdown = readMarkdown(editor).trim();
      expect(markdown).toMatch(/1\.\s+first/);
      expect(markdown).toMatch(/2\.\s+second/);
    });

    it("preserves task list checked state", () => {
      const editor = editorFromMdast(
        doc(ul(li([p(t("done"))], { checked: true }), li([p(t("todo"))], { checked: false }))),
      );
      const markdown = readMarkdown(editor).trim();
      expect(markdown).toContain("- [x] done");
      expect(markdown).toContain("- [ ] todo");
    });
  });

  describe("inline marks", () => {
    it("preserves strikethrough", () => {
      const editor = editorFromMdast(doc(p(strike(t("removed")))));
      expect(readMarkdown(editor).trim()).toBe("~~removed~~");
    });

    it("preserves inline code", () => {
      const editor = editorFromMdast(doc(p(inlineCode("code"))));
      expect(readMarkdown(editor).trim()).toBe("`code`");
    });

    it("preserves links", () => {
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

    it("converts autolinks to markdown links", () => {
      const editor = editorFromMarkdown("https://example.com");
      const key = readFirstLinkKey(editor);

      convertAutoLinkToMarkdownLink(editor, key);

      expect(readMarkdown(editor).trim()).toBe("[https://example.com](https://example.com)");
    });

    it("updates markdown link urls", () => {
      const editor = editorFromMarkdown("[site](https://example.com)");
      const key = readFirstLinkKey(editor);

      updateMarkdownLinkUrl(editor, key, "https://example.org");

      expect(readMarkdown(editor).trim()).toBe("[site](https://example.org)");
    });

    it("removes markdown links while preserving text", () => {
      const editor = editorFromMarkdown("[site](https://example.com)");
      const key = readFirstLinkKey(editor);

      removeMarkdownLink(editor, key);

      expect(readMarkdown(editor).trim()).toBe("site");
    });

    it("imports bare urls as autolink nodes", () => {
      const editor = editorFromMarkdown("https://example.com");
      let isAutoLink = false;
      editor.getEditorState().read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        if ($isElementNode(paragraph)) {
          isAutoLink = $isAutoLinkNode(paragraph.getFirstChild());
        }
      });

      expect(isAutoLink).toBe(true);
    });
  });

  describe("unsupported syntax fallback", () => {
    it("renders inline math as plain text (no inlineMath node survives)", () => {
      const editor = editorFromMarkdown("hello $x^2$ world");
      const mdast = readMdast(editor);
      expect(JSON.stringify(mdast)).not.toContain('"inlineMath"');
      // The literal characters should still appear (escaped or not) so the user sees them
      const markdown = readMarkdown(editor);
      expect(markdown).toContain("x^2");
    });

    it("renders display math as literal text block", () => {
      const editor = editorFromMarkdown("$$\nx^2\n$$");
      const mdast = readMdast(editor);
      expect(JSON.stringify(mdast)).not.toContain('"math"');
    });

    it("renders raw HTML literally", () => {
      const editor = editorFromMarkdown("<details>hidden</details>");
      const mdast = readMdast(editor);
      expect(JSON.stringify(mdast)).not.toContain('"html"');
    });
  });

  describe("round-trip stability", () => {
    it("stable for a complex document", () => {
      const markdown = [
        "# Title",
        "",
        "Paragraph with **bold** and *italic* and `code`.",
        "",
        "> Quote line 1",
        ">",
        "> Quote line 2",
        "",
        "- item one",
        "- item two",
        "  - nested",
        "",
        "1. ordered first",
        "2. ordered second",
        "",
        "- [x] done",
        "- [ ] todo",
        "",
        "```ts",
        "const x = 1;",
        "```",
        "",
        "---",
        "",
      ].join("\n");

      expectMarkdownRoundTripStable(markdown);
    });
  });
});
