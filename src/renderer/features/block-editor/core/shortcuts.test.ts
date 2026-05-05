import { $convertFromMarkdownString } from "@lexical/markdown";
import { describe, expect, it } from "vite-plus/test";

import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "../syntax/registry";
import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import { exportLexicalToSemanticDocument } from "./semantic/lexical-adapter";

function shortcutSemantic(markdown: string) {
  const editor = createHeadlessMarkdownEditor();
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, MARKDOWN_SHORTCUT_TRANSFORMERS);
    },
    { discrete: true },
  );
  return exportLexicalToSemanticDocument(editor.getEditorState());
}

describe("markdown shortcuts", () => {
  it("covers block markdown shortcuts", () => {
    expect(shortcutSemantic("# Heading").children[0]).toMatchObject({
      depth: 1,
      type: "heading",
    });
    expect(shortcutSemantic("## Heading").children[0]).toMatchObject({
      depth: 2,
      type: "heading",
    });
    expect(shortcutSemantic("> Quote").children[0]).toEqual({
      children: [
        {
          children: [{ type: "text", value: "Quote" }],
          type: "paragraph",
        },
      ],
      type: "blockquote",
    });
    expect(shortcutSemantic("- Bullet").children[0]).toMatchObject({
      ordered: false,
      type: "list",
    });
    expect(shortcutSemantic("1. Ordered").children[0]).toMatchObject({
      ordered: true,
      type: "list",
    });
    expect(shortcutSemantic("- [x] Done").children[0]).toMatchObject({
      children: [expect.objectContaining({ checked: true })],
      type: "list",
    });
    expect(shortcutSemantic("- [ ] Todo").children[0]).toMatchObject({
      children: [expect.objectContaining({ checked: false })],
      type: "list",
    });
    expect(shortcutSemantic("```\ncode\n```").children[0]).toMatchObject({
      type: "codeBlock",
      value: "code",
    });
    expect(shortcutSemantic("---").children[0]).toMatchObject({ type: "thematicBreak" });
  });
});
