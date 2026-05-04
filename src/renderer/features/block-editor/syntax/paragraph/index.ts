import "./index.css";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
  type TextFormatType,
  type TextNode,
} from "lexical";
import type { Break, Parent, PhrasingContent } from "mdast";

import type { ExportedMdastNode, MarkdownSyntaxModule } from "../../core/syntax-module";

function createFormattedTextNode(value: string, formats: ReadonlyArray<TextFormatType>): TextNode {
  const textNode = $createTextNode(value);
  for (const format of formats) {
    textNode.toggleFormat(format);
  }
  return textNode;
}

function wrapFormattedTextNode(node: TextNode): PhrasingContent {
  const value = node.getTextContent();

  if (node.hasFormat("code")) {
    return { type: "inlineCode", value };
  }

  let current: PhrasingContent = { type: "text", value };
  if (node.hasFormat("strikethrough")) {
    current = { children: [current], type: "delete" } as PhrasingContent;
  }
  if (node.hasFormat("italic")) {
    current = { children: [current], type: "emphasis" };
  }
  if (node.hasFormat("bold")) {
    current = { children: [current], type: "strong" };
  }

  return current;
}

export function exportInlineLexicalNode(node: LexicalNode): ExportedMdastNode[] {
  if ($isTextNode(node)) {
    return [wrapFormattedTextNode(node)];
  }

  if ($isLineBreakNode(node)) {
    return [{ type: "break" } satisfies Break];
  }

  return [];
}

export const paragraphModule: MarkdownSyntaxModule = {
  exportMdast: {
    linebreak: () => [{ type: "break" }],
    paragraph: (node, ctx) => {
      if (!$isParagraphNode(node)) {
        return [];
      }

      return [
        {
          children: ctx.exportChildren(node) as PhrasingContent[],
          type: "paragraph",
        },
      ];
    },
    text: exportInlineLexicalNode,
  },
  importMdast: {
    break: () => [$createLineBreakNode()],
    paragraph: (node, ctx, formats) => {
      const paragraph = $createParagraphNode();
      paragraph.append(...ctx.importChildren(node as Parent, formats));
      return [paragraph];
    },
    text: (node, _ctx, formats) => {
      if (!("value" in node) || typeof node.value !== "string") {
        return [];
      }

      return [createFormattedTextNode(node.value, formats)];
    },
  },
  name: "paragraph",
  theme: {
    paragraph: "block-editor__paragraph",
  },
};
