import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../test-helper/headless-editor-test-utils";

describe("thematic break syntax", () => {
  it("imports and exports horizontal rules", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot("Before\n\n---\n\nAfter");
    const lexicalNodeTypes = lexical.root.children.map((node) => node.type);
    const mdastNodeTypes = mdast.children.map((node) => node.type);

    expect(lexicalNodeTypes).toContain("horizontalrule");
    expect(mdastNodeTypes).toContain("thematicBreak");
  });
});
