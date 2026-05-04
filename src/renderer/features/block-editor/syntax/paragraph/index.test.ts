import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../test-helper/headless-editor-test-utils";

describe("paragraph syntax", () => {
  it("imports and exports paragraphs with line breaks", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot("Alpha  \nBravo\n\nCharlie");
    const paragraphs = lexical.root.children.filter((node) => node.type === "paragraph");

    expect(paragraphs).toHaveLength(2);
    expect(mdast.children[0]).toMatchObject({ type: "paragraph" });
    expect(mdast.children[1]).toMatchObject({ type: "paragraph" });
    expect(mdast.children[0]?.type === "paragraph" ? mdast.children[0].children : []).toEqual(
      expect.arrayContaining([{ type: "break" }]),
    );
  });
});
