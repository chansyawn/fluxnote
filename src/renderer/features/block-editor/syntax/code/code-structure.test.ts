import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $createTextNode, $getRoot } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { applyAltEnterAtCodeSelection } from "./code-structure";

describe("code structure", () => {
  it("splits code blocks without copying render themes", () => {
    const editor = createHeadlessMarkdownEditor();

    editor.update(
      () => {
        const codeNode = $createCodeNode("typescript", "vitesse-dark");
        codeNode.append($createTextNode("const value = 1;"));
        $getRoot().clear().append(codeNode);

        expect(applyAltEnterAtCodeSelection(codeNode.select(6, 6))).toBe(true);
      },
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const codeNodes = $getRoot()
        .getChildren()
        .filter((node) => $isCodeNode(node));

      expect(codeNodes).toHaveLength(2);
      expect(codeNodes.map((node) => node.getTextContent())).toEqual(["const ", "value = 1;"]);
      expect(codeNodes.map((node) => node.getLanguage())).toEqual(["typescript", "typescript"]);
      expect(codeNodes.map((node) => node.getTheme())).toEqual(["vitesse-light", "vitesse-light"]);
    });
  });
});
