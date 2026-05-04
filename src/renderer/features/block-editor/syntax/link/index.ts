import "./index.css";
import { $createLinkNode, $isLinkNode, LinkNode } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import type { Parent, PhrasingContent } from "mdast";
import { createElement } from "react";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

function LinkSyntaxPlugin() {
  return createElement(LinkPlugin);
}

export const linkModule: MarkdownSyntaxModule = {
  exportMdast: {
    link: (node, ctx) => {
      if (!$isLinkNode(node)) {
        return [];
      }

      return [
        {
          children: ctx.exportChildren(node) as PhrasingContent[],
          title: node.getTitle(),
          type: "link",
          url: node.getURL(),
        },
      ];
    },
  },
  importMdast: {
    link: (node, ctx, formats) => {
      if (!("url" in node) || typeof node.url !== "string") {
        return [];
      }

      const title = "title" in node && typeof node.title === "string" ? node.title : null;
      const link = $createLinkNode(node.url, { title });
      link.append(...ctx.importChildren(node as Parent, formats));
      return [link];
    },
  },
  lexicalNodes: [LinkNode],
  lexicalPlugins: [LinkSyntaxPlugin],
  markdownTransformers: [LINK],
  name: "link",
  theme: {
    link: "block-editor__link",
  },
};
