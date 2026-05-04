import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "./markdown-processor";

describe("markdown processor", () => {
  it("parses GFM and math markdown", () => {
    const markdown = [
      "- [x] done",
      "",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "$$",
      "a^2 + b^2",
      "$$",
    ].join("\n");

    const mdast = parseMarkdownToMdast(markdown);
    const output = stringifyMdastToMarkdown(mdast);

    expect(mdast.children.map((node) => node.type)).toContain("list");
    expect(mdast.children.map((node) => node.type)).toContain("table");
    expect(mdast.children.map((node) => node.type)).toContain("math");
    expect(output).toContain("- [x] done");
    expect(output).toContain("| A | B |");
    expect(output).toContain("a^2 + b^2");
  });
});
