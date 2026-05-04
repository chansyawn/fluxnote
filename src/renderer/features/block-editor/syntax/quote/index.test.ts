import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../test-helper/headless-editor-test-utils";

describe("quote syntax", () => {
  it("imports and exports blockquotes", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot("> Quoted text");
    const quote = lexical.root.children[0];

    expect(quote.type).toBe("quote");
    expect(mdast.children[0]).toMatchObject({ type: "blockquote" });
  });
});
