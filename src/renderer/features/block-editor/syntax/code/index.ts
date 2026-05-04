import "./index.css";
import { $createCodeNode, $isCodeNode, CodeNode } from "@lexical/code";
import { CODE } from "@lexical/markdown";
import { $createTextNode } from "lexical";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

export const codeModule: MarkdownSyntaxModule = {
  exportMdast: {
    code: (node) => {
      if (!$isCodeNode(node)) {
        return [];
      }

      return [
        {
          lang: node.getLanguage() ?? null,
          meta: null,
          type: "code",
          value: node.getTextContent(),
        },
      ];
    },
  },
  importMdast: {
    code: (node) => {
      if (!("value" in node) || typeof node.value !== "string") {
        return [];
      }

      const lang = "lang" in node && typeof node.lang === "string" ? node.lang : null;
      const code = $createCodeNode(lang);
      code.append($createTextNode(node.value));
      return [code];
    },
  },
  lexicalNodes: [CodeNode],
  markdownTransformers: [CODE],
  name: "code",
  theme: {
    code: "block-editor__code",
  },
};
