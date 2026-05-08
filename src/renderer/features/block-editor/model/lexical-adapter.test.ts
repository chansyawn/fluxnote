import { describe, expect, it } from "vite-plus/test";

import {
  createHeadlessMarkdownEditor,
  markdownToSemantic,
} from "../test-helper/headless-editor-test-utils";
import type { SemanticDocument } from "./document";
import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
} from "./lexical-adapter";
import { normalizeSemanticDocument } from "./normalize";

function roundTripLexical(document: SemanticDocument): SemanticDocument {
  const editor = createHeadlessMarkdownEditor();
  importSemanticDocumentToLexical(document, editor);
  return exportLexicalToSemanticDocument(editor.getEditorState());
}

describe("semantic lexical adapter", () => {
  it("roundtrips semantic documents through Lexical", () => {
    const semantic = markdownToSemantic(
      [
        "# Title",
        "",
        "Text **bold** *em* ~~gone~~ `code` [link](https://example.com).",
        "",
        "> Quote",
        "",
        "- [x] Done",
        "- [ ] Todo",
        "",
        "```ts",
        "type Id = string;",
        "```",
      ].join("\n"),
    );

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("preserves blockquote and list containers with block children", () => {
    const semantic = markdownToSemantic(
      [
        "> Paragraph",
        ">",
        "> ## Heading",
        ">",
        "> - Parent",
        ">   - Child",
        "",
        "- Alpha",
        "  ",
        "  ### Nested heading",
        "  ",
        "  - Nested list",
      ].join("\n"),
    );

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("roundtrips explicit multi-block list items", () => {
    const semantic = normalizeSemanticDocument({
      children: [
        {
          children: [
            {
              children: [
                { children: [{ type: "text", value: "Alpha" }], type: "paragraph" },
                { depth: 3, children: [{ type: "text", value: "Detail" }], type: "heading" },
                {
                  children: [
                    {
                      children: [
                        { children: [{ type: "text", value: "Nested" }], type: "paragraph" },
                      ],
                      type: "listItem",
                    },
                  ],
                  ordered: false,
                  type: "list",
                },
              ],
              type: "listItem",
            },
          ],
          ordered: false,
          type: "list",
        },
      ],
      type: "root",
    });

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("keeps normalized mixed task lists stable through Lexical", () => {
    const semantic = markdownToSemantic(["- Normal", "- [x] Done"].join("\n"));

    expect(roundTripLexical(semantic)).toEqual(semantic);
    expect(semantic.children[0]).toEqual(
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

  it("normalizes ordered task lists through Lexical", () => {
    const semantic = markdownToSemantic(["1. [x] Done", "2. Normal"].join("\n"));
    const roundTripped = roundTripLexical(semantic);

    expect(roundTripped).toEqual(semantic);
    expect(roundTripped.children[0]).toEqual(
      expect.objectContaining({
        children: [
          expect.objectContaining({ checked: true }),
          expect.objectContaining({ checked: false }),
        ],
        ordered: false,
        type: "list",
      }),
    );
  });

  it("preserves inline code combined with marks through Lexical", () => {
    const semantic = markdownToSemantic(
      ["**`code`**", "", "***bold italic***", "", "~~**deleted strong**~~"].join("\n"),
    );
    const roundTripped = roundTripLexical(semantic);

    expect(roundTripped).toEqual(semantic);
    expect(JSON.stringify(roundTripped)).toContain('"type":"inlineCode"');
    expect(JSON.stringify(roundTripped)).toContain('"type":"strong"');
    expect(JSON.stringify(roundTripped)).toContain('"type":"emphasis"');
    expect(JSON.stringify(roundTripped)).toContain('"type":"delete"');
  });

  it("keeps soft and hard breaks distinct through Lexical", () => {
    const semantic = normalizeSemanticDocument({
      children: [
        {
          children: [
            { type: "text", value: "Alpha" },
            { type: "softBreak" },
            { type: "text", value: "Beta" },
            { type: "hardBreak" },
            { type: "text", value: "Gamma" },
          ],
          type: "paragraph",
        },
      ],
      type: "root",
    });

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("keeps images inline through Lexical", () => {
    const semantic = normalizeSemanticDocument({
      children: [
        {
          children: [
            { type: "text", value: "Before " },
            {
              alt: "Alt text",
              title: "Preview",
              type: "image",
              url: "assets://block-1/photo.png",
            },
            { type: "text", value: " after" },
          ],
          type: "paragraph",
        },
      ],
      type: "root",
    });

    expect(roundTripLexical(semantic)).toEqual(semantic);
  });

  it("keeps GFM table structure and alignment through Lexical", () => {
    const semantic = markdownToSemantic(
      ["| Name | Count |", "| :--- | ---: |", "| Alpha | 1 |", "| **Beta** | `2` |"].join("\n"),
    );

    expect(roundTripLexical(semantic)).toEqual(semantic);
    expect(semantic.children[0]).toEqual(
      expect.objectContaining({
        align: ["left", "right"],
        type: "table",
      }),
    );
  });
});
