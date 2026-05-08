import type { Root } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { parseMarkdownToMdast } from "../markdown/processor";
import { expectSemanticRoundTripStable } from "../test-helper/assertions";
import { mdastToSemanticDocument } from "./mdast-adapter";

function roundTripSemantic(markdown: string) {
  return expectSemanticRoundTripStable(markdown);
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

  it("does not treat mdast listItem as a standalone semantic block", () => {
    const semantic = mdastToSemanticDocument({
      children: [
        {
          children: [{ children: [{ type: "text", value: "Orphan" }], type: "paragraph" }],
          type: "listItem",
        },
      ],
      type: "root",
    } as Root);

    expect(JSON.stringify(semantic)).not.toContain("listItem");
    expect(semantic).toEqual({ children: [{ children: [], type: "paragraph" }], type: "root" });
  });

  it("normalizes mixed unordered task lists to homogeneous task lists", () => {
    const { firstSemantic, secondSemantic } = roundTripSemantic(
      ["- Normal", "- [x] Done"].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({ checked: false }),
          expect.objectContaining({ checked: true }),
        ],
        ordered: false,
        type: "list",
      }),
    );
  });

  it("does not preserve ordered list start numbers", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      ["3. Third", "4. Fourth"].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(JSON.stringify(firstSemantic)).not.toContain("start");
    expect(canonicalMarkdown).toContain("1. Third");
    expect(canonicalMarkdown).toContain("2. Fourth");
  });

  it("normalizes ordered task lists to task lists", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      ["1. [x] Done", "2. Normal"].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({ checked: true }),
          expect.objectContaining({ checked: false }),
        ],
        ordered: false,
        type: "list",
      }),
    );
    expect(canonicalMarkdown).toContain("- [x] Done");
    expect(canonicalMarkdown).toContain("- [ ] Normal");
  });

  it("classifies block html as opaqueBlock", () => {
    const semantic = mdastToSemanticDocument(parseMarkdownToMdast("<section>HTML</section>"));

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        kind: "html",
        type: "opaqueBlock",
      }),
    );
  });

  it("classifies inline html as opaqueInline", () => {
    const semantic = mdastToSemanticDocument(parseMarkdownToMdast("hello <span>HTML</span> world"));

    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        type: "paragraph",
      }),
    );
    expect(JSON.stringify(semantic.children[0])).toContain('"type":"opaqueInline"');
    expect(JSON.stringify(semantic.children[0])).not.toContain('"type":"opaqueBlock"');
  });

  it("roundtrips opaque block math without dropping it", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      ["$$", "a^2 + b^2 = c^2", "$$"].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual(
      expect.objectContaining({
        kind: "math",
        type: "opaqueBlock",
      }),
    );
    expect(canonicalMarkdown).toContain("a^2 + b^2 = c^2");
  });

  it("roundtrips opaque inline math without dropping it", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } =
      roundTripSemantic("Inline $x^2$ math.");

    expect(secondSemantic).toEqual(firstSemantic);
    expect(JSON.stringify(firstSemantic)).toContain('"kind":"inlineMath"');
    expect(JSON.stringify(firstSemantic)).toContain('"type":"opaqueInline"');
    expect(canonicalMarkdown).toContain("$x^2$");
  });

  it("roundtrips inline code combined with marks", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      ["**`code`**", "", "***bold italic***", "", "~~**deleted strong**~~"].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(JSON.stringify(firstSemantic)).toContain('"type":"inlineCode"');
    expect(JSON.stringify(firstSemantic)).toContain('"type":"strong"');
    expect(JSON.stringify(firstSemantic)).toContain('"type":"emphasis"');
    expect(JSON.stringify(firstSemantic)).toContain('"type":"delete"');
    expect(canonicalMarkdown).toContain("`code`");
  });

  it("roundtrips image as semantic inline content", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      'Before ![Alt text](https://example.com/image.png "Preview") after',
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual({
      children: [
        { type: "text", value: "Before " },
        {
          alt: "Alt text",
          title: "Preview",
          type: "image",
          url: "https://example.com/image.png",
        },
        { type: "text", value: " after" },
      ],
      type: "paragraph",
    });
    expect(canonicalMarkdown).toBe(
      'Before ![Alt text](https://example.com/image.png "Preview") after\n',
    );
  });

  it("roundtrips GFM tables with column alignment", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      [
        "| Name | Count | Notes |",
        "| :--- | ---: | :---: |",
        "| Alpha | 1 | **bold** |",
        "| Beta | 2 | [link](https://example.com) |",
      ].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual({
      align: ["left", "right", "center"],
      rows: [
        {
          cells: [
            { children: [{ type: "text", value: "Name" }], type: "tableCell" },
            { children: [{ type: "text", value: "Count" }], type: "tableCell" },
            { children: [{ type: "text", value: "Notes" }], type: "tableCell" },
          ],
          type: "tableRow",
        },
        expect.objectContaining({ type: "tableRow" }),
        expect.objectContaining({ type: "tableRow" }),
      ],
      type: "table",
    });
    expect(canonicalMarkdown).toContain("| Name");
    expect(canonicalMarkdown).toContain(":----");
    expect(canonicalMarkdown).toContain("----:");
  });

  it("classifies plain markdown newlines as soft breaks", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic("Alpha\nBeta");

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual({
      children: [
        { type: "text", value: "Alpha" },
        { type: "softBreak" },
        { type: "text", value: "Beta" },
      ],
      type: "paragraph",
    });
    expect(canonicalMarkdown).toBe("Alpha\nBeta\n");
  });

  it("keeps markdown hard breaks distinct from soft breaks", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic("Alpha\\\nBeta");

    expect(secondSemantic).toEqual(firstSemantic);
    expect(firstSemantic.children[0]).toEqual({
      children: [
        { type: "text", value: "Alpha" },
        { type: "hardBreak" },
        { type: "text", value: "Beta" },
      ],
      type: "paragraph",
    });
    expect(canonicalMarkdown).toBe("Alpha\\\nBeta\n");
  });

  it("roundtrips nested quote list and task list semantics", () => {
    const { canonicalMarkdown, firstSemantic, secondSemantic } = roundTripSemantic(
      [
        "> - [x] Task",
        ">   ",
        ">   Task detail",
        "",
        "- Parent",
        "  ",
        "  > Nested quote",
        "  ",
        "  - Nested list",
        "",
        "3. Third",
        "4. Fourth",
      ].join("\n"),
    );

    expect(secondSemantic).toEqual(firstSemantic);
    expect(canonicalMarkdown).toContain("> - [x] Task");
    expect(canonicalMarkdown).toContain("1. Third");
    expect(canonicalMarkdown).toContain("2. Fourth");
  });

  it("imports isolated checkbox markers without triggering gfm task assertions", () => {
    const mdast = parseMarkdownToMdast(
      [
        "-",
        "[ ] ",
        "  1.",
        "",
        "* Hello",
        "",
        "- [ ] Todo",
        "- [x] Done",
        "  - [ ] Nested",
        "",
        "    [ ] code",
      ].join("\n"),
    );
    const semantic = mdastToSemanticDocument(mdast);

    expect(mdast.children[1]).toEqual(
      expect.objectContaining({
        children: [expect.objectContaining({ type: "text", value: "[ ]\n1." })],
        type: "paragraph",
      }),
    );
    expect(JSON.stringify(semantic)).toContain('"checked":false');
    expect(JSON.stringify(semantic)).toContain('"checked":true');
    expect(JSON.stringify(semantic)).toContain('"value":"[ ] code"');
  });

  it("imports supported and unsupported syntax without source offsets", () => {
    const semantic = mdastToSemanticDocument(
      parseMarkdownToMdast(
        [
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
    expect(JSON.stringify(semantic)).toContain('"type":"table"');
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
