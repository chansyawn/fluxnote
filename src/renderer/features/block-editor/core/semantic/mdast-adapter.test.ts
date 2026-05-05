import type { Root } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown-processor";
import { mdastToSemanticDocument, semanticDocumentToMdast } from "./mdast-adapter";

function roundTripSemantic(markdown: string) {
  const firstSemantic = mdastToSemanticDocument(parseMarkdownToMdast(markdown));
  const canonicalMarkdown = stringifyMdastToMarkdown(semanticDocumentToMdast(firstSemantic));
  const secondSemantic = mdastToSemanticDocument(parseMarkdownToMdast(canonicalMarkdown));

  return { canonicalMarkdown, firstSemantic, secondSemantic };
}

describe("semantic mdast adapter", () => {
  it("roundtrips markdown through semantic documents", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      [
        "# Title",
        "",
        "Alpha **bold** *em* ~~gone~~ `code` [link](https://example.com).",
        "",
        "> ## Quote",
        "> - [x] Done",
        "> - [ ] Todo",
        "",
        "```ts",
        "type Id = string;",
        "```",
        "",
        "---",
      ].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(canonicalMarkdown).toContain("# Title");
    expect(canonicalMarkdown).toContain("- [x] Done");
    expect(canonicalMarkdown).toContain("---");
  });

  it("keeps container semantics stable", () => {
    const { firstSemantic, secondSemantic } = roundTripSemantic(
      [
        "> Quoted paragraph",
        ">",
        "> ### Quoted heading",
        ">",
        "> - Alpha",
        ">   - Nested",
        ">",
        "> > Nested quote",
        "",
        "1. One",
        "1. Two",
        "",
        "- Parent",
        "  ",
        "  Continuation paragraph",
        "  ",
        "  1. Child",
      ].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "blockquote" }),
        expect.objectContaining({ ordered: true, type: "list" }),
        expect.objectContaining({ ordered: false, type: "list" }),
      ]),
    );
  });

  it("imports unsupported syntax as opaque nodes without source offsets", () => {
    const semantic = mdastToSemanticDocument(
      parseMarkdownToMdast(
        [
          "![Alt](https://example.com/image.png)",
          "",
          "| A | B |",
          "| - | - |",
          "| 1 | 2 |",
          "",
          "$$",
          "a^2 + b^2",
          "$$",
          "",
          "<section>HTML</section>",
        ].join("\n"),
      ),
    );

    expect(JSON.stringify(semantic)).not.toContain("position");
    expect(JSON.stringify(semantic)).not.toContain("offset");
    expect(JSON.stringify(semantic)).toContain("opaqueInline");
    expect(JSON.stringify(semantic)).toContain("opaqueBlock");
  });

  it("converts unknown mdast blocks to opaque fallback markdown", () => {
    const root = {
      children: [{ type: "unknownBlock", value: "payload" }],
      type: "root",
    } as unknown as Root;
    const semantic = mdastToSemanticDocument(root);

    expect(semantic.children[0]).toEqual({
      kind: "unknownBlock",
      markdown: "<!-- unsupported:unknownBlock -->",
      type: "opaqueBlock",
    });
  });
});
