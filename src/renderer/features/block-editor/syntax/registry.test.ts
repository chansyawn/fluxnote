import { isValidElement } from "react";
import { describe, expect, it } from "vite-plus/test";

import {
  createHeadlessMarkdownEditor,
  parseMarkdownWithShortcuts,
} from "../test-helper/headless-editor-test-utils";
import { SYNTAX_NODES, SYNTAX_RUNTIME_PLUGINS } from "./registry";

describe("syntax registry", () => {
  it("provides lexical nodes for headless editor initialization", () => {
    expect(SYNTAX_NODES.length).toBeGreaterThan(0);

    const editor = createHeadlessMarkdownEditor();
    expect(editor).toBeDefined();
  });

  it("exposes renderable runtime plugins", () => {
    expect(SYNTAX_RUNTIME_PLUGINS.length).toBeGreaterThan(0);
    expect(
      SYNTAX_RUNTIME_PLUGINS.map((plugin) => (isValidElement(plugin) ? plugin.type : null)),
    ).not.toContain(null);
  });

  it("supports markdown shortcut parsing with aggregated registry", () => {
    const semantic = parseMarkdownWithShortcuts(["# Heading", "", "- [x] Done"].join("\n"));

    expect(semantic.children[0]).toMatchObject({ type: "heading" });
    expect(semantic.children[1]).toMatchObject({
      children: [expect.objectContaining({ checked: true })],
      type: "list",
    });
  });
});
