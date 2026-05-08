import { $createLinkNode, $isLinkNode, LinkExtension } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { linkFromMdast, linkToMdast } from "./mdast";

export { linkFromMdast, linkToMdast } from "./mdast";

export const LINK_MARKDOWN_SHORTCUT_TRANSFORMERS = [LINK];

export const LINK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/link",
  dependencies: [
    configExtension(LinkExtension, {
      attributes: undefined,
      validateUrl: undefined,
    }),
  ],
  theme: {
    link: "block-editor__link",
  },
});

export const LINK_SYNTAX = {
  id: "link",
  extension: LINK_SYNTAX_EXTENSION,
  lexical: {
    fromInline: (node, context) =>
      $isLinkNode(node)
        ? [
            {
              children: context.readInlines(node.getChildren()),
              title: node.getTitle(),
              type: "link",
              url: node.getURL(),
            },
          ]
        : null,
    toInline: (node, context) => {
      if (node.type !== "link") {
        return null;
      }

      const link = $createLinkNode(node.url, { title: node.title });
      link.append(...node.children.flatMap((child) => context.writeInline(child)));
      return [link];
    },
  },
  lexicalNodeNames: ["LinkNode"],
  markdownShortcuts: LINK_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromInline: (node, context) =>
      node.type === "link" ? [linkFromMdast(node, context.readInlines)] : null,
    toInline: (node, context) =>
      node.type === "link" ? [linkToMdast(node, context.writeInlines)] : null,
  },
  mdastTypes: ["link"],
  semanticTypes: ["link"],
} satisfies SyntaxRegistration;
