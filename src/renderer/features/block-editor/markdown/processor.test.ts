import { describe, expect, it } from "vitest";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "./processor";

describe("processor", () => {
  it("parses basic markdown to mdast", () => {
    const root = parseMarkdownToMdast("# Hello\n\nWorld");
    expect(root.children).toHaveLength(2);
    expect(root.children[0].type).toBe("heading");
    expect(root.children[1].type).toBe("paragraph");
  });

  it("stringifies mdast to markdown", () => {
    const markdown = stringifyMdastToMarkdown({
      children: [{ children: [{ type: "text", value: "hi" }], type: "paragraph" }],
      type: "root",
    });
    expect(markdown.trim()).toBe("hi");
  });

  it("preserves task list checked state", () => {
    const input = "- [x] done\n- [ ] todo\n";
    const result = stringifyMdastToMarkdown(parseMarkdownToMdast(input));
    expect(result).toContain("[x] done");
    expect(result).toContain("[ ] todo");
  });

  it("normalizes empty task items", () => {
    const root = parseMarkdownToMdast("- [ ] task");
    const list = root.children[0];
    if (list.type === "list") {
      list.children[0].children = [{ children: [], type: "paragraph" }];
    }
    const result = stringifyMdastToMarkdown(root);
    // Should not crash and should produce a checkbox marker
    expect(result).toMatch(/\[\s\]/);
  });

  it("keeps bare http urls as plain markdown text", () => {
    const result = stringifyMdastToMarkdown(parseMarkdownToMdast("https://example.com"));
    expect(result.trim()).toBe("https://example.com");
  });

  it("normalizes angle bracket urls to bare markdown text", () => {
    const result = stringifyMdastToMarkdown(parseMarkdownToMdast("<https://example.com>"));
    expect(result.trim()).toBe("https://example.com");
  });

  it("preserves explicit markdown links", () => {
    const result = stringifyMdastToMarkdown(
      parseMarkdownToMdast("[https://example.com](https://example.com)"),
    );
    expect(result.trim()).toBe("[https://example.com](https://example.com)");
  });
});
