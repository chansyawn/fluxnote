import { describe, expect, it } from "vite-plus/test";

import { normalizeExternalMarkdown } from "./external-markdown";

describe("normalizeExternalMarkdown", () => {
  it("decodes horizontal whitespace entities in plain markdown chunks", () => {
    expect(normalizeExternalMarkdown("&#x20;a&#32;\na&#x9;\na&#9;")).toBe(" a \na\t\na\t");
  });

  it("keeps non-whitespace entities unchanged", () => {
    expect(normalizeExternalMarkdown("&amp; &#60; &#x3c;")).toBe("&amp; &#60; &#x3c;");
  });

  it("removes word-internal underscore escapes", () => {
    expect(normalizeExternalMarkdown(String.raw`a\_b abc\_123 1\_2`)).toBe("a_b abc_123 1_2");
  });

  it("preserves underscore escapes outside word-internal positions", () => {
    expect(normalizeExternalMarkdown(String.raw`\_a a\_ a \_b a\_\_b`)).toBe(
      String.raw`\_a a\_ a \_b a\_\_b`,
    );
  });

  it("removes escaped dollars that do not look like math delimiters", () => {
    expect(normalizeExternalMarkdown(String.raw`\$ price \$5 hello \$ world`)).toBe(
      "$ price $5 hello $ world",
    );
  });

  it("removes independent escaped dollars on the same line", () => {
    expect(normalizeExternalMarkdown(String.raw`cost \$5 and \$6`)).toBe("cost $5 and $6");
  });

  it("removes currency dollars before a later math-like pair", () => {
    expect(normalizeExternalMarkdown(String.raw`cost \$5 and literal \$x\$`)).toBe(
      String.raw`cost $5 and literal \$x\$`,
    );
  });

  it("preserves escaped dollar pairs that could become inline math", () => {
    expect(normalizeExternalMarkdown(String.raw`\$x\$ and \$(x + y)\$`)).toBe(
      String.raw`\$x\$ and \$(x + y)\$`,
    );
  });

  it("preserves adjacent escaped dollars", () => {
    expect(normalizeExternalMarkdown(String.raw`\$\$`)).toBe(String.raw`\$\$`);
  });

  it("skips fenced code blocks", () => {
    const markdown = [
      "```ts",
      String.raw`const key = "a\_b";`,
      "const trailing = '&#x20;';",
      "```not a closing fence a\\_b",
      String.raw`const price = "\$5";`,
      "```",
      String.raw`a\_b \$5`,
    ].join("\n");

    expect(normalizeExternalMarkdown(markdown)).toBe(
      [
        "```ts",
        String.raw`const key = "a\_b";`,
        "const trailing = '&#x20;';",
        "```not a closing fence a\\_b",
        String.raw`const price = "\$5";`,
        "```",
        "a_b $5",
      ].join("\n"),
    );
  });

  it("skips tilde fenced code blocks", () => {
    const markdown = ["~~~", String.raw`a\_b \$5`, "~~~", String.raw`a\_b \$5`].join("\n");

    expect(normalizeExternalMarkdown(markdown)).toBe(
      ["~~~", String.raw`a\_b \$5`, "~~~", "a_b $5"].join("\n"),
    );
  });

  it("skips inline code spans", () => {
    expect(normalizeExternalMarkdown("`a\\_b \\$5 &#x20;` and a\\_b \\$5 &#x20;")).toBe(
      "`a\\_b \\$5 &#x20;` and a_b $5  ",
    );
  });

  it("skips multi-backtick inline code spans", () => {
    expect(normalizeExternalMarkdown("`` `a\\_b` \\$5 `` and a\\_b")).toBe(
      "`` `a\\_b` \\$5 `` and a_b",
    );
  });
});
