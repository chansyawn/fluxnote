import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../utils/headless-editor-test-utils";

interface LexicalInlineNode {
  type: string;
}

interface LexicalParagraphNode {
  children?: LexicalInlineNode[];
}

describe("emphasis syntax", () => {
  it("imports and exports inline formats", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot(
      "This is **bold**, *italic*, ~~deleted~~, and `code`.",
    );
    const paragraph = lexical.root.children[0] as LexicalParagraphNode;
    const inlineTypes = paragraph.children?.map((child) => child.type) ?? [];
    const strongNode =
      mdast.children[0]?.type === "paragraph"
        ? mdast.children[0].children.find((node) => node.type === "strong")
        : null;
    const emphasisNode =
      mdast.children[0]?.type === "paragraph"
        ? mdast.children[0].children.find((node) => node.type === "emphasis")
        : null;
    const deleteNode =
      mdast.children[0]?.type === "paragraph"
        ? mdast.children[0].children.find((node) => node.type === "delete")
        : null;
    const inlineCodeNode =
      mdast.children[0]?.type === "paragraph"
        ? mdast.children[0].children.find((node) => node.type === "inlineCode")
        : null;

    expect(inlineTypes).toContain("text");
    expect(strongNode).toBeTruthy();
    expect(emphasisNode).toBeTruthy();
    expect(deleteNode).toBeTruthy();
    expect(inlineCodeNode).toBeTruthy();
  });
});
