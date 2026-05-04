import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../test-helper/headless-editor-test-utils";

describe("list syntax", () => {
  it("imports and exports ordered and unordered lists", () => {
    const { lexical, markdown, mdast } = createMarkdownSyntaxSnapshot(
      ["- Alpha", "- Beta", "", "1. One", "2. Two"].join("\n"),
    );
    const lexicalListNodes = lexical.root.children.filter((node) => node.type === "list") as Array<{
      listType?: string;
      type: string;
    }>;
    const mdastLists = mdast.children.filter((node) => node.type === "list");

    expect(lexicalListNodes.map((node) => node.listType)).toEqual(
      expect.arrayContaining(["bullet", "number"]),
    );
    expect(mdastLists.map((list) => (list.type === "list" ? list.ordered : null))).toEqual(
      expect.arrayContaining([false, true]),
    );
    expect(markdown).toContain("- Alpha");
    expect(markdown).toContain("1. One");
  });
});
