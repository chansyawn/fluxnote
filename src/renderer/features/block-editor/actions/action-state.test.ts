import { describe, expect, it } from "vite-plus/test";

import {
  editorFromMarkdown,
  editorFromMdast,
  expectEditorMarkdown,
} from "../test-helper/editor-driver";
import { selectText } from "../test-helper/interaction-driver";
import { doc, li, p, quote, t, ul } from "../test-helper/mdast-builders";
import { executeBlockEditorAction } from "./action-definitions";
import { readBlockEditorActionState } from "./action-state";

describe("Block Editor action state", () => {
  it("tracks quote and list actions independently", () => {
    const editor = editorFromMdast(doc(quote(ul(li([p(t("Item"))])))));
    selectText(editor, "Item");

    const state = readBlockEditorActionState(editor);

    expect(state.activeActions["editor.blockquote"]).toBe(true);
    expect(state.activeActions["editor.bulletList"]).toBe(true);
    expect(state.activeActions["editor.orderedList"]).toBe(false);
  });

  it("tracks multiple inline actions independently", () => {
    const editor = editorFromMarkdown("Text");
    selectText(editor, "Text");
    executeBlockEditorAction("editor.bold", { editor });
    executeBlockEditorAction("editor.italic", { editor });

    const state = readBlockEditorActionState(editor);

    expect(state.activeActions["editor.bold"]).toBe(true);
    expect(state.activeActions["editor.italic"]).toBe(true);
    expect(state.activeActions["editor.inlineCode"]).toBe(false);
  });

  it("unwraps quote without removing nested list structure", () => {
    const editor = editorFromMdast(doc(quote(ul(li([p(t("Item"))])))));
    selectText(editor, "Item");

    executeBlockEditorAction("editor.blockquote", { editor });

    expectEditorMarkdown(editor, "- Item");
  });
});
