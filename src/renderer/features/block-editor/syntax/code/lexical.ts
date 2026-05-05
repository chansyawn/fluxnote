import { $createCodeNode, type CodeNode } from "@lexical/code";
import { $createTextNode, type LexicalNode } from "lexical";

import type { SemanticCodeBlock } from "../../core/semantic/document";

export function codeBlockToLexical(node: SemanticCodeBlock): LexicalNode {
  const code = $createCodeNode(node.lang ?? undefined);
  code.append($createTextNode(node.value));
  return code;
}

export function codeBlockFromLexical(node: CodeNode): SemanticCodeBlock {
  return {
    lang: node.getLanguage() ?? null,
    type: "codeBlock",
    value: node.getTextContent(),
  };
}
