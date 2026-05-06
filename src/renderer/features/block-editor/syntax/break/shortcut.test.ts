import { $getRoot, $isTextNode, KEY_ENTER_COMMAND } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import {
  exportLexicalToSemanticDocument,
  importSemanticDocumentToLexical,
} from "../../core/semantic/lexical-adapter";
import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { registerSoftBreakShortcut } from "./soft-break-shortcut-plugin";

function shiftEnterEvent(onPreventDefault: () => void): KeyboardEvent {
  return {
    preventDefault: onPreventDefault,
    shiftKey: true,
  } as KeyboardEvent;
}

describe("soft break shortcut", () => {
  it("creates soft break from shift enter", () => {
    const editor = createHeadlessMarkdownEditor();
    importSemanticDocumentToLexical(
      {
        children: [{ children: [{ type: "text", value: "AlphaBeta" }], type: "paragraph" }],
        type: "root",
      },
      editor,
    );
    const unregister = registerSoftBreakShortcut(editor);
    let prevented = false;

    editor.update(
      () => {
        const textNode = $getRoot()
          .getAllTextNodes()
          .find((node) => $isTextNode(node) && node.getTextContent() === "AlphaBeta");

        if (!textNode) {
          throw new Error("Missing text node in soft break shortcut test");
        }

        textNode.select(5, 5);
        expect(
          editor.dispatchCommand(
            KEY_ENTER_COMMAND,
            shiftEnterEvent(() => {
              prevented = true;
            }),
          ),
        ).toBe(true);
      },
      { discrete: true },
    );

    unregister();
    expect(prevented).toBe(true);
    expect(exportLexicalToSemanticDocument(editor.getEditorState()).children[0]).toEqual({
      children: [
        { type: "text", value: "Alpha" },
        { type: "softBreak" },
        { type: "text", value: "Beta" },
      ],
      type: "paragraph",
    });
  });
});
