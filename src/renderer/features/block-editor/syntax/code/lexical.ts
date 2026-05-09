import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $createTextNode, type LexicalNode } from "lexical";
import type { Code } from "mdast";

import { PLAIN_TEXT_LANGUAGE } from "./code-language-options";

export function codeBlockToLexical(node: Code): LexicalNode {
  const code = $createCodeNode(node.lang ?? undefined);
  code.append($createTextNode(node.value));
  return code;
}

export function codeBlockFromLexical(node: LexicalNode): Code | null {
  if (!$isCodeNode(node)) return null;

  const language = node.getLanguage();
  return {
    lang: language && language !== PLAIN_TEXT_LANGUAGE ? language : null,
    meta: null,
    type: "code",
    value: node.getTextContent(),
  };
}
