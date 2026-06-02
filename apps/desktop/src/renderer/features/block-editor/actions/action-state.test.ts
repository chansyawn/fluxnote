import { describe, expect, it } from "vite-plus/test";

import {
  editorFromMarkdown,
  editorFromMdast,
  expectEditorMarkdown,
} from "../test-helper/editor-driver";
import { selectText, selectTextRange } from "../test-helper/interaction-driver";
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

  it("tracks link action active and disabled state", () => {
    const linkEditor = editorFromMarkdown("[Text](https://example.com)");
    selectText(linkEditor, "Text", 2);

    const activeState = readBlockEditorActionState(linkEditor);

    expect(activeState.activeActions["editor.link"]).toBe(true);
    expect(activeState.disabledActions["editor.link"]).toBe(false);

    const emptyEditor = editorFromMarkdown("Text gap");
    selectText(emptyEditor, "Text gap", 5);

    const disabledState = readBlockEditorActionState(emptyEditor);

    expect(disabledState.activeActions["editor.link"]).toBe(false);
    expect(disabledState.disabledActions["editor.link"]).toBe(true);

    const selectedEditor = editorFromMarkdown("Text");
    selectTextRange(selectedEditor, "Text", 0, 4);

    const selectedState = readBlockEditorActionState(selectedEditor);

    expect(selectedState.activeActions["editor.link"]).toBe(false);
    expect(selectedState.disabledActions["editor.link"]).toBe(false);
  });

  it("reports managed focus when the link action creates a link editor", () => {
    const editor = editorFromMarkdown("Text");
    selectTextRange(editor, "Text", 0, 4);

    expect(executeBlockEditorAction("editor.link", { editor })).toEqual({
      action: "editor.link",
      focus: "managed",
      status: "executed",
    });
    expectEditorMarkdown(editor, "[Text]()");
  });

  it("reports editor focus when the link action removes an existing link", () => {
    const editor = editorFromMarkdown("[Text](https://example.com)");
    selectText(editor, "Text", 2);

    expect(executeBlockEditorAction("editor.link", { editor })).toEqual({
      action: "editor.link",
      focus: "editor",
      status: "executed",
    });
    expectEditorMarkdown(editor, "Text");
  });
});
