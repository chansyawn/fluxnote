import { createEditor } from "lexical";
import { describe, expect, it } from "vite-plus/test";

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

describe("placeholder nodes", () => {
  it("exports canonical opaque json fields", () => {
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
        blockJson = $createPlaceholderBlockNode("| A | B |", "table", {
          align: ["left"],
        }).exportJSON() as SerializedPlaceholderBlockNode;
        inlineJson = $createPlaceholderInlineNode(
          "![Alt](https://example.com/image.png)",
          "image",
        ).exportJSON() as SerializedPlaceholderInlineNode;
      },
      { discrete: true },
    );

    expect(blockJson).toEqual({
      kind: "table",
      markdown: "| A | B |",
      metadata: { align: ["left"] },
      type: "placeholder-block",
      version: 1,
    });
    expect(inlineJson).toEqual({
      kind: "image",
      markdown: "![Alt](https://example.com/image.png)",
      type: "placeholder-inline",
      version: 1,
    });
  });
});
