import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../utils/headless-editor-test-utils";

interface LexicalLinkNode {
  title?: string;
  type: string;
  url?: string;
}

interface LexicalParagraphNode {
  children?: LexicalLinkNode[];
  type: string;
}

describe("link syntax", () => {
  it("imports and exports links as link nodes", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot(
      '[Flux](https://example.com "Example")',
    );
    const paragraph = lexical.root.children[0] as LexicalParagraphNode;
    const link = paragraph.children?.[0] ?? null;

    expect(paragraph.type).toBe("paragraph");
    expect(link).toMatchObject({
      title: "Example",
      type: "link",
      url: "https://example.com",
    });
    expect(mdast.children[0]).toMatchObject({ type: "paragraph" });
    expect(
      mdast.children[0]?.type === "paragraph" ? mdast.children[0].children[0] : null,
    ).toMatchObject({
      type: "link",
      url: "https://example.com",
    });
  });
});
