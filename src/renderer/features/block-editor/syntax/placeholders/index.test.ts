import { createEditor } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";
import {
  $createPlaceholderBlockNode,
  PlaceholderBlockNode,
  type SerializedPlaceholderBlockNode,
} from "./placeholder-block-node";
import {
  $createPlaceholderInlineNode,
  PlaceholderInlineNode,
  type SerializedPlaceholderInlineNode,
} from "./placeholder-inline-node";

describe("placeholder syntax", () => {
  it("preserves complex markdown as raw placeholders", () => {
    const markdown = [
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
      "[^note]: Footnote text",
    ].join("\n");

    const output = roundTripMarkdown(markdown);

    expect(output).toContain("![Alt](https://example.com/image.png)");
    expect(output).toContain("| A | B |");
    expect(output).toContain("a^2 + b^2");
    expect(output).toContain("[^note]: Footnote text");
  });

  it("exports minimal placeholder json fields", () => {
    const editor = createEditor({
      nodes: [PlaceholderBlockNode, PlaceholderInlineNode],
      onError(error) {
        throw error;
      },
    });

    let blockJson: SerializedPlaceholderBlockNode | null = null;
    let inlineJson: SerializedPlaceholderInlineNode | null = null;

    editor.update(
      () => {
        blockJson = $createPlaceholderBlockNode(
          "| A | B |",
          "table",
        ).exportJSON() as SerializedPlaceholderBlockNode;
        inlineJson = $createPlaceholderInlineNode(
          "![Alt](https://example.com/image.png)",
          "image",
        ).exportJSON() as SerializedPlaceholderInlineNode;
      },
      { discrete: true },
    );

    expect(blockJson).toEqual({
      mdastType: "table",
      raw: "| A | B |",
      type: "placeholder-block",
      version: 1,
    });
    expect(inlineJson).toEqual({
      mdastType: "image",
      raw: "![Alt](https://example.com/image.png)",
      type: "placeholder-inline",
      version: 1,
    });
  });
});
