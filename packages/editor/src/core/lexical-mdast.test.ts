import { describe, expect, it } from "vite-plus/test";

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
  ol,
  p,
  quote,
  strike,
  t,
  ul,
} from "../test-helper/mdast-builders";

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
