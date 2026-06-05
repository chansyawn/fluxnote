import { $isCodeNode, type CodeNode } from "@lexical/code";
import { loadCodeTheme } from "@lexical/code-shiki";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $isElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import { useEffect } from "react";

import { useBlockEditorConfig } from "../../core/config";

export const CODE_SHIKI_LIGHT_THEME = "vitesse-light";
export const CODE_SHIKI_DARK_THEME = "vitesse-dark";
export const CODE_SHIKI_DEFAULT_THEME = CODE_SHIKI_LIGHT_THEME;

export function getShikiThemeName(resolvedTheme: "light" | "dark"): string {
  return resolvedTheme === "dark" ? CODE_SHIKI_DARK_THEME : CODE_SHIKI_LIGHT_THEME;
}

function collectCodeNodes(node: LexicalNode, codeNodes: CodeNode[]): void {
  if ($isCodeNode(node)) {
    codeNodes.push(node);
    return;
  }

  if (!$isElementNode(node)) {
    return;
  }

  for (const child of node.getChildren()) {
    collectCodeNodes(child, codeNodes);
  }
}

function readHasCodeNodeWithDifferentTheme(theme: string): boolean {
  const codeNodes: CodeNode[] = [];
  collectCodeNodes($getRoot(), codeNodes);
  return codeNodes.some((codeNode) => codeNode.getTheme() !== theme);
}

export function applyCodeShikiTheme(editor: LexicalEditor, theme: string): void {
  void loadCodeTheme(theme, editor);

  const shouldUpdate = editor.getEditorState().read(() => readHasCodeNodeWithDifferentTheme(theme));
  if (!shouldUpdate) {
    return;
  }

  editor.update(() => {
    const codeNodes: CodeNode[] = [];
    collectCodeNodes($getRoot(), codeNodes);

    for (const codeNode of codeNodes) {
      if (codeNode.getTheme() !== theme) {
        codeNode.setTheme(theme);
      }
    }
  });
}

export function CodeShikiThemeDecorator() {
  const [editor] = useLexicalComposerContext();
  const { appearance } = useBlockEditorConfig();
  const { resolvedTheme } = appearance;
  const shikiThemeName = getShikiThemeName(resolvedTheme);

  useEffect(() => {
    applyCodeShikiTheme(editor, shikiThemeName);

    return editor.registerUpdateListener(() => {
      applyCodeShikiTheme(editor, shikiThemeName);
    });
  }, [editor, shikiThemeName]);

  return null;
}
