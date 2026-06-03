import { $getRoot } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMarkdown, expectEditorMarkdown, readMdast } from "../test-helper/editor-driver";
import { applyBlockFormat, readBlockFormatFromSelection } from "./block-format";

describe("block format", () => {
  it("toggles heading formats back to paragraph", () => {
    const editor = editorFromMarkdown("Plain text");

    editor.update(
      () => {
        selectFirstBlock();
        applyBlockFormat("heading1");
      },
      { discrete: true },
    );

    expect(readBlockFormatFromEditor(editor)).toBe("heading1");
    expectEditorMarkdown(editor, "# Plain text");

    editor.update(
      () => {
        selectFirstBlock();
        applyBlockFormat("heading1");
      },
      { discrete: true },
    );

    expect(readBlockFormatFromEditor(editor)).toBe("paragraph");
    expectEditorMarkdown(editor, "Plain text");
  });

  it("replaces list formats", () => {
    const editor = editorFromMarkdown("- Item");

    editor.update(
      () => {
        selectFirstBlock();
        applyBlockFormat("orderedList");
      },
      { discrete: true },
    );

    expect(readBlockFormatFromEditor(editor)).toBe("orderedList");
    expectEditorMarkdown(editor, "1. Item");
  });

  it("applies quote and code block formats", () => {
    const editor = editorFromMarkdown("Plain text");

    editor.update(
      () => {
        selectFirstBlock();
        applyBlockFormat("blockquote");
      },
      { discrete: true },
    );

    expect(readMdast(editor).children[0]?.type).toBe("blockquote");
    expect(readBlockFormatFromEditor(editor)).toBe("blockquote");

    editor.update(
      () => {
        selectFirstBlock();
        applyBlockFormat("codeBlock");
      },
      { discrete: true },
    );

    expect(readMdast(editor).children[0]?.type).toBe("code");
    expect(readBlockFormatFromEditor(editor)).toBe("codeBlock");
  });
});

function readBlockFormatFromEditor(editor: ReturnType<typeof editorFromMarkdown>) {
  let format = "paragraph";
  editor.getEditorState().read(() => {
    format = readBlockFormatFromSelection();
  });
  return format;
}

function selectFirstBlock(): void {
  $getRoot().getFirstChild()?.selectStart();
}
