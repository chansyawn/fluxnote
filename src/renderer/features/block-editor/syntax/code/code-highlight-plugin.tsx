import { $isCodeNode, type CodeNode } from "@lexical/code";
import { loadCodeTheme, registerCodeHighlighting, ShikiTokenizer } from "@lexical/code-shiki";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useThemeState } from "@renderer/app/theme";
import { $getRoot, $isElementNode, type LexicalNode } from "lexical";
import { useEffect } from "react";

const BLOCK_EDITOR_SHIKI_TOKENIZER = {
  ...ShikiTokenizer,
  defaultLanguage: "plain",
};

export function getShikiThemeName(resolvedTheme: "light" | "dark"): string {
  return resolvedTheme === "dark" ? "vitesse-dark" : "vitesse-light";
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

export function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  const { resolvedTheme } = useThemeState();
  const shikiThemeName = getShikiThemeName(resolvedTheme);

  useEffect(() => {
    void loadCodeTheme(shikiThemeName, editor);
    return registerCodeHighlighting(editor, BLOCK_EDITOR_SHIKI_TOKENIZER);
  }, [editor, shikiThemeName]);

  useEffect(() => {
    void loadCodeTheme(shikiThemeName, editor);
    editor.update(() => {
      const codeNodes: CodeNode[] = [];
      collectCodeNodes($getRoot(), codeNodes);

      for (const codeNode of codeNodes) {
        codeNode.setTheme(shikiThemeName);
      }
    });
  }, [editor, shikiThemeName]);

  return null;
}
