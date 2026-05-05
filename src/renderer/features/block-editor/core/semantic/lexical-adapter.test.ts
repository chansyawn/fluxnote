import { describe, expect, it } from "vite-plus/test";

import {
  createHeadlessMarkdownEditor,
  markdownToSemantic,
} from "../../test-helper/headless-editor-test-utils";
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
});
