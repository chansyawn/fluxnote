import { $createCodeNode, type CodeNode } from "@lexical/code";
import { $createTextNode, type LexicalNode } from "lexical";

import type { SemanticCodeBlock } from "../../model";
import { PLAIN_TEXT_LANGUAGE } from "./code-language-options";

export function codeBlockToLexical(node: SemanticCodeBlock): LexicalNode {
  const code = $createCodeNode(node.lang ?? undefined);
  code.append($createTextNode(node.value));
  return code;
}

export function codeBlockFromLexical(node: CodeNode): SemanticCodeBlock {
  const language = node.getLanguage();

  return {
    lang: language && language !== PLAIN_TEXT_LANGUAGE ? language : null,
    type: "codeBlock",
    value: node.getTextContent(),
  };
}
