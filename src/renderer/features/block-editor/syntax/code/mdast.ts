import type { Code } from "mdast";

import type { SemanticCodeBlock } from "../../core/semantic/document";

export function codeBlockFromMdast(node: Code): SemanticCodeBlock {
  return {
    lang: node.lang ?? null,
    type: "codeBlock",
    value: node.value,
  };
}

export function codeBlockToMdast(node: SemanticCodeBlock): Code {
  return {
    lang: node.lang,
    meta: null,
    type: "code",
    value: node.value,
  };
}
