import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../utils/headless-editor-test-utils";

describe("heading syntax", () => {
  it("imports and exports heading depth", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot("# One\n\n### Three");
    const lexicalHeadings = lexical.root.children.filter((node) => node.type === "heading");
    const mdastHeadings = mdast.children.filter((node) => node.type === "heading");

    expect(lexicalHeadings).toHaveLength(2);
    expect(lexicalHeadings[0]).toMatchObject({ tag: "h1", type: "heading" });
    expect(lexicalHeadings[1]).toMatchObject({ tag: "h3", type: "heading" });
    expect(mdastHeadings).toHaveLength(2);
    expect(mdastHeadings[0]).toMatchObject({ depth: 1, type: "heading" });
    expect(mdastHeadings[1]).toMatchObject({ depth: 3, type: "heading" });
  });
});
