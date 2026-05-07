import { isValidElement } from "react";
import { describe, expect, it } from "vite-plus/test";

import {
  createHeadlessMarkdownEditor,
  parseMarkdownWithShortcuts,
} from "../test-helper/headless-editor-test-utils";
import { createSyntaxRuntimePlugins, SYNTAX_NODES } from "./registry";

describe("syntax registry", () => {
  it("provides lexical nodes for headless editor initialization", () => {
    expect(SYNTAX_NODES.length).toBeGreaterThan(0);

    const editor = createHeadlessMarkdownEditor();
    expect(editor).toBeDefined();
  });

  it("exposes renderable runtime plugins", () => {
    const runtimePlugins = createSyntaxRuntimePlugins({ blockId: "block-1" });

    expect(runtimePlugins.length).toBeGreaterThan(0);
    expect(
      runtimePlugins.map((plugin) => (isValidElement(plugin) ? plugin.type : null)),
    ).not.toContain(null);
  });

  it("supports markdown shortcut parsing with aggregated registry", () => {
    const semantic = parseMarkdownWithShortcuts(
      ["# Heading", "", "- [x] Done", "", "![Alt](https://example.com/image.png)"].join("\n"),
    );

    expect(semantic.children[0]).toMatchObject({ type: "heading" });
    expect(semantic.children[1]).toMatchObject({
      children: [expect.objectContaining({ checked: true })],
      type: "list",
    });
    expect(semantic.children[2]).toEqual({
      children: [
        {
          alt: "Alt",
          title: null,
          type: "image",
          url: "https://example.com/image.png",
        },
      ],
      type: "paragraph",
    });
  });

  it("parses mixed block shortcuts in one document", () => {
    const semantic = parseMarkdownWithShortcuts(
      ["# Heading", "", "> Quote", "", "- Bullet", "", "```", "code", "```", "", "---"].join("\n"),
    );

    expect(semantic.children[0]).toMatchObject({
      depth: 1,
      type: "heading",
    });
    expect(semantic.children[1]).toEqual({
      children: [
        {
          children: [{ type: "text", value: "Quote" }],
          type: "paragraph",
        },
      ],
      type: "blockquote",
    });
    expect(semantic.children[2]).toMatchObject({
      ordered: false,
      type: "list",
    });
    expect(semantic.children[3]).toMatchObject({
      type: "codeBlock",
      value: "code",
    });
    expect(semantic.children[4]).toMatchObject({ type: "thematicBreak" });
  });
});
